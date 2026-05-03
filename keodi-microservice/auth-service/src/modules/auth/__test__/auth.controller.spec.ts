import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { OtpPurpose } from 'src/shared/enums/otp.enum';
import { VerifyUrlPurpose } from 'src/shared/enums/verifyUrl.enum';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            registerOwner: jest.fn(),
            login: jest.fn(),
            googleLogin: jest.fn(),
            sendOTPWithPurpose: jest.fn(),
            validateOTPWithPurpose: jest.fn(),
            resetPassword: jest.fn(),
            verifyEmail: jest.fn(),
            externalResendVerifyEmail: jest.fn(),
            resendVerifyEmail: jest.fn(),
            refresh: jest.fn(),
            approveOwner: jest.fn(),
            rejectOwner: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('register', () => {
    it('delegates to authService.register with the provided payload', async () => {
      const dto = { username: 'user', password: 'pass', email: 'a@b.com' };
      authService.register.mockResolvedValue({ message: 'User created successfully', userId: 'uid' });

      const result = await controller.register(dto);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ message: 'User created successfully', userId: 'uid' });
    });
  });

  describe('registerOwner', () => {
    it('delegates to authService.registerOwner with the provided payload', async () => {
      const dto = {
        username: 'owner',
        password: 'pass',
        email: 'o@b.com',
        businessName: 'Biz',
        businessPhone: '123',
        businessAddress: 'addr',
        taxId: 'tax1',
        proofDocumentUrls: [],
      };
      authService.registerOwner.mockResolvedValue({
        message: 'Owner application submitted successfully',
        userId: 'uid',
        ownerApplicationId: 'oa-id',
      });

      const result = await controller.registerOwner(dto);

      expect(authService.registerOwner).toHaveBeenCalledWith(dto);
      expect(result?.ownerApplicationId).toBe('oa-id');
    });
  });

  describe('login', () => {
    it('delegates to authService.login and returns tokens', async () => {
      const dto = { identifier: 'user', password: 'pass' };
      authService.login.mockResolvedValue({
        accessToken: 'at',
        refreshToken: 'rt',
      });

      const result = await controller.login(dto);

      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ accessToken: 'at', refreshToken: 'rt' });
    });
  });

  describe('googleLogin', () => {
    it('delegates to authService.googleLogin', async () => {
      const googlePayload = { email: 'g@g.com', firstName: 'G', lastName: 'L', picture: '' };
      authService.googleLogin.mockResolvedValue({ accessToken: 'gat', refreshToken: 'grt' });

      const result = await controller.googleLogin(googlePayload);

      expect(authService.googleLogin).toHaveBeenCalledWith(googlePayload);
      expect(result).toEqual({ accessToken: 'gat', refreshToken: 'grt' });
    });
  });

  describe('forgotPasswordOTP', () => {
    it('calls sendOTPWithPurpose with FORGOT_PASSWORD purpose', async () => {
      authService.sendOTPWithPurpose.mockResolvedValue({ userId: 'uid' });

      const result = await controller.forgotPasswordOTP({ email: 'a@b.com' });

      expect(authService.sendOTPWithPurpose).toHaveBeenCalledWith(
        'a@b.com',
        OtpPurpose.FORGOT_PASSWORD,
      );
      expect(result).toEqual({ userId: 'uid' });
    });
  });

  describe('resetPasswordOTP', () => {
    it('calls sendOTPWithPurpose with RESET_PASSWORD purpose', async () => {
      authService.sendOTPWithPurpose.mockResolvedValue({ userId: 'uid' });

      await controller.resetPasswordOTP({ email: 'a@b.com' });

      expect(authService.sendOTPWithPurpose).toHaveBeenCalledWith(
        'a@b.com',
        OtpPurpose.RESET_PASSWORD,
      );
    });
  });

  describe('validateOTP', () => {
    it('delegates to authService.validateOTPWithPurpose', async () => {
      const dto = { userId: 'uid', otp: '123456', purpose: OtpPurpose.FORGOT_PASSWORD };
      authService.validateOTPWithPurpose.mockResolvedValue({ resetToken: 'rt' });

      const result = await controller.validateOTP(dto);

      expect(authService.validateOTPWithPurpose).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ resetToken: 'rt' });
    });
  });

  describe('resetPassword', () => {
    it('delegates to authService.resetPassword', async () => {
      const dto = { newPassword: 'newpass', userId: 'uid' };
      authService.resetPassword.mockResolvedValue({ message: 'Password reset successfully' });

      const result = await controller.resetPassword(dto);

      expect(authService.resetPassword).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ message: 'Password reset successfully' });
    });
  });

  describe('verifyEmail', () => {
    it('delegates to authService.verifyEmail with the token', async () => {
      authService.verifyEmail.mockResolvedValue('<html>success</html>');

      const result = await controller.verifyEmail({ token: 'tok123' });

      expect(authService.verifyEmail).toHaveBeenCalledWith('tok123');
      expect(result).toBe('<html>success</html>');
    });
  });

  describe('externalResendVerifyEmail', () => {
    it('calls authService.externalResendVerifyEmail with VERIFY_EMAIL purpose', async () => {
      authService.externalResendVerifyEmail.mockResolvedValue('<html>resent</html>');

      await controller.externalResendVerifyEmail({ userId: 'uid' });

      expect(authService.externalResendVerifyEmail).toHaveBeenCalledWith(
        'uid',
        VerifyUrlPurpose.VERIFY_EMAIL,
      );
    });
  });

  describe('resendVerifyEmail', () => {
    it('calls authService.resendVerifyEmail with VERIFY_EMAIL purpose', async () => {
      authService.resendVerifyEmail.mockResolvedValue({ message: 'resend email successfully' });

      await controller.resendVerifyEmail({ userId: 'uid' });

      expect(authService.resendVerifyEmail).toHaveBeenCalledWith(
        'uid',
        VerifyUrlPurpose.VERIFY_EMAIL,
      );
    });
  });

  describe('refresh', () => {
    it('delegates to authService.refresh with the refreshToken', async () => {
      authService.refresh.mockResolvedValue({ accessToken: 'nat', refreshToken: 'nrt' });

      const result = await controller.refresh({ refreshToken: 'rt' });

      expect(authService.refresh).toHaveBeenCalledWith('rt');
      expect(result).toEqual({ accessToken: 'nat', refreshToken: 'nrt' });
    });
  });

  describe('approveOwner', () => {
    it('delegates to authService.approveOwner', async () => {
      authService.approveOwner.mockResolvedValue({ message: 'Owner approved successfully' });

      const result = await controller.approveOwner({ userId: 'uid' });

      expect(authService.approveOwner).toHaveBeenCalledWith('uid');
      expect(result).toEqual({ message: 'Owner approved successfully' });
    });
  });

  describe('rejectOwner', () => {
    it('delegates to authService.rejectOwner with userId and reason', async () => {
      authService.rejectOwner.mockResolvedValue({ message: 'Owner rejected successfully' });

      const result = await controller.rejectOwner({ userId: 'uid', reason: 'fraud' });

      expect(authService.rejectOwner).toHaveBeenCalledWith('uid', 'fraud');
      expect(result).toEqual({ message: 'Owner rejected successfully' });
    });
  });
});
