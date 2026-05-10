import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { GoogleService } from 'src/providers/google/google.service';
import { AuthTopics, UserTopics } from 'src/shared/constants/topic.constant';
import { Response } from 'express';

const mockKafkaService = {
  sendWithTimeout: jest.fn(),
};

const mockConfigService = {
  get: jest.fn(),
};

const mockGoogleService = {
  verifyIdToken: jest.fn(),
};

const mockResponse = () => {
  const res: Partial<Response> = {
    cookie: jest.fn(),
    redirect: jest.fn(),
  };
  return res as Response;
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: KafkaService, useValue: mockKafkaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: GoogleService, useValue: mockGoogleService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should call kafkaService.sendWithTimeout with Register topic', async () => {
      const body = { email: 'test@example.com', password: 'pass123', firstName: 'John', lastName: 'Doe' } as any;
      const result = { userId: 'uuid-1' };
      mockKafkaService.sendWithTimeout.mockResolvedValue(result);

      const response = await service.register(body);

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(AuthTopics.Register, body);
      expect(response).toEqual(result);
    });

    it('should rethrow error from kafkaService on register', async () => {
      const body = { email: 'test@example.com', password: 'pass' } as any;
      const error = new Error('Kafka error');
      mockKafkaService.sendWithTimeout.mockRejectedValue(error);

      await expect(service.register(body)).rejects.toThrow('Kafka error');
    });
  });

  describe('registerOwner', () => {
    it('should call kafkaService.sendWithTimeout with RegisterOwner topic', async () => {
      const body = { email: 'owner@example.com', password: 'pass123' } as any;
      const result = { userId: 'uuid-2' };
      mockKafkaService.sendWithTimeout.mockResolvedValue(result);

      const response = await service.registerOwner(body);

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(AuthTopics.RegisterOwner, body);
      expect(response).toEqual(result);
    });

    it('should rethrow error from kafkaService on registerOwner', async () => {
      mockKafkaService.sendWithTimeout.mockRejectedValue(new Error('fail'));
      await expect(service.registerOwner({} as any)).rejects.toThrow('fail');
    });
  });

  describe('login', () => {
    it('should set refreshToken cookie and return accessToken (rememberMe=true)', async () => {
      const res = mockResponse();
      const body = { email: 'user@example.com', password: 'pass', rememberMe: true } as any;
      mockKafkaService.sendWithTimeout.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const result = await service.login(res, body);

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(AuthTopics.Login, body);
      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'refresh-token',
        expect.objectContaining({ httpOnly: true, secure: true, maxAge: 365 * 24 * 60 * 60 * 1000 }),
      );
      expect(result).toEqual({ accessToken: 'access-token' });
    });

    it('should set refreshToken cookie with 7-day expiry when rememberMe=false', async () => {
      const res = mockResponse();
      const body = { email: 'user@example.com', password: 'pass', rememberMe: false } as any;
      mockKafkaService.sendWithTimeout.mockResolvedValue({
        accessToken: 'at',
        refreshToken: 'rt',
      });

      await service.login(res, body);

      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'rt',
        expect.objectContaining({ maxAge: 7 * 24 * 60 * 60 * 1000 }),
      );
    });

    it('should rethrow error from kafkaService on login', async () => {
      const res = mockResponse();
      mockKafkaService.sendWithTimeout.mockRejectedValue(new Error('login failed'));
      await expect(service.login(res, {} as any)).rejects.toThrow('login failed');
    });
  });

  describe('googleLoginMobile', () => {
    it('should verify token, call Google topic, set cookie and return accessToken', async () => {
      const res = mockResponse();
      mockGoogleService.verifyIdToken.mockResolvedValue({
        email: 'g@example.com',
        given_name: 'G',
        family_name: 'User',
        picture: 'http://pic.url',
      });
      mockKafkaService.sendWithTimeout.mockResolvedValue({
        accessToken: 'gat',
        refreshToken: 'grt',
      });

      const result = await service.googleLoginMobile(res, 'valid-id-token');

      expect(mockGoogleService.verifyIdToken).toHaveBeenCalledWith('valid-id-token');
      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        AuthTopics.Google,
        { email: 'g@example.com', firstName: 'G', lastName: 'User', picture: 'http://pic.url' },
      );
      expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'grt', expect.any(Object));
      expect(result).toEqual({ accessToken: 'gat' });
    });

    it('should throw UnauthorizedException if Google verifyIdToken returns null', async () => {
      const res = mockResponse();
      mockGoogleService.verifyIdToken.mockResolvedValue(null);

      await expect(service.googleLoginMobile(res, 'bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if verifyIdToken throws', async () => {
      const res = mockResponse();
      mockGoogleService.verifyIdToken.mockRejectedValue(new Error('token error'));

      await expect(service.googleLoginMobile(res, 'bad-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('googleCallback', () => {
    it('should call Google topic, set cookie and redirect', async () => {
      const res = mockResponse();
      mockKafkaService.sendWithTimeout.mockResolvedValue({
        accessToken: 'at',
        refreshToken: 'rt',
      });
      mockConfigService.get.mockReturnValue('http://frontend.app');

      await service.googleCallback(res, { email: 'g@test.com' });

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(AuthTopics.Google, { email: 'g@test.com' });
      expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'rt', expect.any(Object));
      expect(res.redirect).toHaveBeenCalledWith('http://frontend.app/auth-google');
    });

    it('should rethrow error on googleCallback failure', async () => {
      const res = mockResponse();
      mockKafkaService.sendWithTimeout.mockRejectedValue(new Error('callback error'));

      await expect(service.googleCallback(res, {})).rejects.toThrow('callback error');
    });
  });

  describe('forgotPasswordOTP', () => {
    it('should send ForgotPasswordOtp topic with body', async () => {
      const body = { email: 'user@example.com' } as any;
      mockKafkaService.sendWithTimeout.mockResolvedValue({ message: 'OTP sent' });

      const result = await service.forgotPasswordOTP(body);

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(AuthTopics.ForgotPasswordOtp, body);
      expect(result).toEqual({ message: 'OTP sent' });
    });

    it('should rethrow error from forgotPasswordOTP', async () => {
      mockKafkaService.sendWithTimeout.mockRejectedValue(new Error('otp error'));
      await expect(service.forgotPasswordOTP({} as any)).rejects.toThrow('otp error');
    });
  });

  describe('resetPasswordOTP', () => {
    it('should send ResetPasswordOtp topic with body', async () => {
      const body = { userId: 'uuid-1' } as any;
      mockKafkaService.sendWithTimeout.mockResolvedValue({ message: 'OTP sent' });

      await service.resetPasswordOTP(body);

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(AuthTopics.ResetPasswordOtp, body);
    });
  });

  describe('validateOtp', () => {
    it('should merge body with purpose and call ValidateOtp topic', async () => {
      const body = { email: 'user@example.com', otp: '123456' } as any;
      const purpose = 'FORGOT_PASSWORD';
      mockKafkaService.sendWithTimeout.mockResolvedValue({ resetToken: 'rt' });

      const result = await service.validateOtp(body, purpose);

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        AuthTopics.ValidateOtp,
        { ...body, purpose },
      );
      expect(result).toEqual({ resetToken: 'rt' });
    });
  });

  describe('resetPassword', () => {
    it('should call ResetPassword topic with body', async () => {
      const body = { newPassword: 'newpass', userId: 'uuid-1' };
      mockKafkaService.sendWithTimeout.mockResolvedValue({ message: 'Password reset' });

      await service.resetPassword(body);

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(AuthTopics.ResetPassword, body);
    });
  });

  describe('verifyEmail', () => {
    it('should call VerifyEmail topic with token wrapped in object', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue('<html>verified</html>');

      const result = await service.verifyEmail('some-verify-token');

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        AuthTopics.VerifyEmail,
        { token: 'some-verify-token' },
      );
      expect(result).toBe('<html>verified</html>');
    });
  });

  describe('externalResendVerifyEmail', () => {
    it('should call ExternalResendVerifyEmail topic with userId', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue('<html>resent</html>');

      await service.externalResendVerifyEmail('user-id-1');

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        AuthTopics.ExternalResendVerifyEmail,
        { userId: 'user-id-1' },
      );
    });
  });

  describe('resendVerifyEmail', () => {
    it('should call ResendVerifyEmail topic with userId', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue({ message: 'Email resent' });

      await service.resendVerifyEmail('user-id-2');

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        AuthTopics.ResendVerifyEmail,
        { userId: 'user-id-2' },
      );
    });
  });

  describe('me', () => {
    it('should merge user dto with kafka user info', async () => {
      const user = { id: 'uuid-1', email: 'me@example.com', roles: ['user'] } as any;
      mockKafkaService.sendWithTimeout.mockResolvedValue({ username: 'jdoe', picture: 'http://pic' });

      const result = await service.me(user);

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(UserTopics.Get, { userId: 'uuid-1' });
      expect(result).toEqual({ username: 'jdoe', picture: 'http://pic', ...user });
    });

    it('should rethrow error when kafka fails for me()', async () => {
      mockKafkaService.sendWithTimeout.mockRejectedValue(new Error('kafka down'));
      await expect(service.me({ id: 'id-1' } as any)).rejects.toThrow('kafka down');
    });
  });

  describe('refresh', () => {
    it('should call Refresh topic, set new cookie and return accessToken', async () => {
      const res = mockResponse();
      // exp = 9999999999 (far future timestamp in seconds)
      const payload = { exp: 9999999999 };
      const b64 = Buffer.from(JSON.stringify(payload)).toString('base64');
      const fakeRefreshToken = `header.${b64}.signature`;

      mockKafkaService.sendWithTimeout.mockResolvedValue({
        accessToken: 'new-at',
        refreshToken: fakeRefreshToken,
      });

      const result = await service.refresh(res, 'old-rt');

      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        AuthTopics.Refresh,
        { refreshToken: 'old-rt' },
      );
      expect(res.cookie).toHaveBeenCalledWith('refreshToken', fakeRefreshToken, expect.any(Object));
      expect(result).toEqual({ accessToken: 'new-at' });
    });

    it('should propagate kafka error from refresh', async () => {
      const res = mockResponse();
      mockKafkaService.sendWithTimeout.mockRejectedValue(new Error('refresh failed'));

      await expect(service.refresh(res, 'rt')).rejects.toThrow('refresh failed');
    });
  });
});
