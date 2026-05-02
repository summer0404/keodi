import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, HttpStatus } from '@nestjs/common';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { OtpPurpose } from 'src/shared/enums/otp.enum';
import { Response, Request } from 'express';

const mockAuthService = {
  register: jest.fn(),
  registerOwner: jest.fn(),
  login: jest.fn(),
  googleCallback: jest.fn(),
  googleLoginMobile: jest.fn(),
  forgotPasswordOTP: jest.fn(),
  resetPasswordOTP: jest.fn(),
  validateOtp: jest.fn(),
  resetPassword: jest.fn(),
  verifyEmail: jest.fn(),
  externalResendVerifyEmail: jest.fn(),
  resendVerifyEmail: jest.fn(),
  me: jest.fn(),
  refresh: jest.fn(),
};

const mockResponse = (): Partial<Response> => ({
  cookie: jest.fn(),
  redirect: jest.fn(),
});

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should call authService.register and return result', async () => {
      const body = { email: 'a@b.com', password: 'pass', firstName: 'A', lastName: 'B' } as any;
      const result = { userId: 'u1' };
      mockAuthService.register.mockResolvedValue(result);

      const response = await controller.register(body);

      expect(mockAuthService.register).toHaveBeenCalledWith(body);
      expect(response).toEqual(result);
    });

    it('should propagate error from authService.register', async () => {
      mockAuthService.register.mockRejectedValue(new Error('register error'));
      await expect(controller.register({} as any)).rejects.toThrow('register error');
    });
  });

  describe('registerOwner', () => {
    it('should call authService.registerOwner and return result', async () => {
      const body = { email: 'owner@b.com', password: 'pass' } as any;
      mockAuthService.registerOwner.mockResolvedValue({ userId: 'u2' });

      const result = await controller.registerOwner(body);

      expect(mockAuthService.registerOwner).toHaveBeenCalledWith(body);
      expect(result).toEqual({ userId: 'u2' });
    });
  });

  describe('login', () => {
    it('should call authService.login with res and body', async () => {
      const res = mockResponse() as Response;
      const body = { email: 'user@b.com', password: 'pass', rememberMe: false } as any;
      mockAuthService.login.mockResolvedValue({ accessToken: 'at' });

      const result = await controller.login(res, body);

      expect(mockAuthService.login).toHaveBeenCalledWith(res, body);
      expect(result).toEqual({ accessToken: 'at' });
    });

    it('should propagate error from authService.login', async () => {
      const res = mockResponse() as Response;
      mockAuthService.login.mockRejectedValue(new UnauthorizedException('Invalid credentials'));
      await expect(controller.login(res, {} as any)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('googleCallback', () => {
    it('should throw UnauthorizedException when req.user is missing', async () => {
      const res = mockResponse() as Response;
      const req = { user: null } as any;

      await expect(controller.googleCallback(res, req)).rejects.toThrow(UnauthorizedException);
    });

    it('should call authService.googleCallback when req.user is present', async () => {
      const res = mockResponse() as Response;
      const req = { user: { email: 'g@g.com' } } as any;
      mockAuthService.googleCallback.mockResolvedValue(undefined);

      await controller.googleCallback(res, req);

      expect(mockAuthService.googleCallback).toHaveBeenCalledWith(res, req.user);
    });
  });

  describe('googleLoginMobile', () => {
    it('should call authService.googleLoginMobile with res and token', async () => {
      const res = mockResponse() as Response;
      const dto = { token: 'id-token-123' } as any;
      mockAuthService.googleLoginMobile.mockResolvedValue({ accessToken: 'gat' });

      const result = await controller.googleLoginMobile(res, dto);

      expect(mockAuthService.googleLoginMobile).toHaveBeenCalledWith(res, 'id-token-123');
      expect(result).toEqual({ accessToken: 'gat' });
    });

    it('should propagate UnauthorizedException from googleLoginMobile', async () => {
      const res = mockResponse() as Response;
      mockAuthService.googleLoginMobile.mockRejectedValue(new UnauthorizedException());
      await expect(controller.googleLoginMobile(res, { token: 'bad' } as any)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('forgotPasswordOTP', () => {
    it('should call authService.forgotPasswordOTP', async () => {
      const body = { email: 'user@b.com' } as any;
      mockAuthService.forgotPasswordOTP.mockResolvedValue({ message: 'OTP sent' });

      const result = await controller.forgotPasswordOTP(body);

      expect(mockAuthService.forgotPasswordOTP).toHaveBeenCalledWith(body);
      expect(result).toEqual({ message: 'OTP sent' });
    });
  });

  describe('resetPasswordOTP', () => {
    it('should call authService.resetPasswordOTP', async () => {
      const body = { userId: 'u1' } as any;
      mockAuthService.resetPasswordOTP.mockResolvedValue({ message: 'OTP sent' });

      await controller.resetPasswordOTP(body);

      expect(mockAuthService.resetPasswordOTP).toHaveBeenCalledWith(body);
    });
  });

  describe('validateForgotPasswordOtp', () => {
    it('should call authService.validateOtp with FORGOT_PASSWORD purpose', async () => {
      const body = { email: 'user@b.com', otp: '123456' } as any;
      mockAuthService.validateOtp.mockResolvedValue({ resetToken: 'rt' });

      const result = await controller.validateForgotPasswordOtp(body);

      expect(mockAuthService.validateOtp).toHaveBeenCalledWith(body, OtpPurpose.FORGOT_PASSWORD);
      expect(result).toEqual({ resetToken: 'rt' });
    });
  });

  describe('validateResetPasswordOtp', () => {
    it('should call authService.validateOtp with RESET_PASSWORD purpose', async () => {
      const body = { email: 'user@b.com', otp: '654321' } as any;
      mockAuthService.validateOtp.mockResolvedValue({ resetToken: 'rt2' });

      const result = await controller.validateResetPasswordOtp(body);

      expect(mockAuthService.validateOtp).toHaveBeenCalledWith(body, OtpPurpose.RESET_PASSWORD);
      expect(result).toEqual({ resetToken: 'rt2' });
    });
  });

  describe('resetPassword', () => {
    it('should call authService.resetPassword with userId from req.user and newPassword', async () => {
      const req = { user: { id: 'user-id-1' } } as any;
      const body = { newPassword: 'newpass123' } as any;
      mockAuthService.resetPassword.mockResolvedValue({ message: 'Password reset' });

      const result = await controller.resetPassword(req, body);

      expect(mockAuthService.resetPassword).toHaveBeenCalledWith({
        newPassword: 'newpass123',
        userId: 'user-id-1',
      });
      expect(result).toEqual({ message: 'Password reset' });
    });

    it('should pass undefined userId when req.user is missing', async () => {
      const req = {} as any;
      const body = { newPassword: 'newpass' } as any;
      mockAuthService.resetPassword.mockResolvedValue({ message: 'done' });

      await controller.resetPassword(req, body);

      expect(mockAuthService.resetPassword).toHaveBeenCalledWith({
        newPassword: 'newpass',
        userId: undefined,
      });
    });
  });

  describe('verifyEmail', () => {
    it('should call authService.verifyEmail with token param', async () => {
      mockAuthService.verifyEmail.mockResolvedValue('<html>verified</html>');

      const result = await controller.verifyEmail('verify-token-abc');

      expect(mockAuthService.verifyEmail).toHaveBeenCalledWith('verify-token-abc');
      expect(result).toBe('<html>verified</html>');
    });
  });

  describe('externalResendVerifyEmail', () => {
    it('should call authService.externalResendVerifyEmail with userId param', async () => {
      mockAuthService.externalResendVerifyEmail.mockResolvedValue('<html>resent</html>');

      const result = await controller.externalResendVerifyEmail('u-id-1');

      expect(mockAuthService.externalResendVerifyEmail).toHaveBeenCalledWith('u-id-1');
    });
  });

  describe('resendVerifyEmail', () => {
    it('should call authService.resendVerifyEmail with userId param', async () => {
      mockAuthService.resendVerifyEmail.mockResolvedValue({ message: 'Email resent' });

      const result = await controller.resendVerifyEmail('u-id-2');

      expect(mockAuthService.resendVerifyEmail).toHaveBeenCalledWith('u-id-2');
      expect(result).toEqual({ message: 'Email resent' });
    });
  });

  describe('me', () => {
    it('should call authService.me with current user', async () => {
      const user = { id: 'uuid-1', email: 'me@example.com' } as any;
      mockAuthService.me.mockResolvedValue({ ...user, username: 'jdoe' });

      const result = await controller.me(user);

      expect(mockAuthService.me).toHaveBeenCalledWith(user);
      expect(result).toEqual({ ...user, username: 'jdoe' });
    });
  });

  describe('refresh', () => {
    it('should call authService.refresh when refreshToken cookie is present', async () => {
      const req = { cookies: { refreshToken: 'stored-rt' } } as any;
      const res = mockResponse() as Response;
      mockAuthService.refresh.mockResolvedValue({ accessToken: 'new-at' });

      const result = await controller.refresh(req, res);

      expect(mockAuthService.refresh).toHaveBeenCalledWith(res, 'stored-rt');
      expect(result).toEqual({ accessToken: 'new-at' });
    });

    it('should throw UnauthorizedException when no refreshToken cookie', async () => {
      const req = { cookies: {} } as any;
      const res = mockResponse() as Response;

      await expect(controller.refresh(req, res)).rejects.toThrow(UnauthorizedException);
      expect(mockAuthService.refresh).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when cookies is undefined', async () => {
      const req = {} as any;
      const res = mockResponse() as Response;

      await expect(controller.refresh(req, res)).rejects.toThrow(UnauthorizedException);
    });
  });
});
