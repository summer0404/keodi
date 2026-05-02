import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { AuthService } from '../auth.service';
import { PrismaService } from 'src/database/prisma.service';
import { UserService } from 'src/modules/user/user.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { OtpService } from '../otp.service';
import { VerifyUrlService } from '../verifyUrl.service';
import { AuthErrorMessages } from 'src/shared/constants/error.constant';
import { VerifyUrlPurpose } from 'src/shared/enums/verifyUrl.enum';
import { OtpPurpose } from 'src/shared/enums/otp.enum';
import { NotificationTopics, OwnerApplicationTopics } from 'src/shared/constants/topic.constant';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-value'),
  compare: jest.fn(),
}));

import * as bcrypt from 'bcrypt';

const makeUser = (overrides: Partial<any> = {}) => ({
  id: 'user-id',
  username: 'testuser',
  email: 'test@example.com',
  password: 'hashed-pass',
  role: Role.USER,
  isVerified: true,
  refreshToken: 'hashed-rt',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: jest.Mocked<PrismaService>;
  let jwtService: jest.Mocked<JwtService>;
  let otpService: jest.Mocked<OtpService>;
  let verifyUrlService: jest.Mocked<VerifyUrlService>;
  let userService: jest.Mocked<UserService>;
  let kafkaService: jest.Mocked<KafkaService>;
  let mockEmit: jest.Mock;

  beforeEach(async () => {
    mockEmit = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('signed-token'),
            decode: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: OtpService,
          useValue: {
            sendOTP: jest.fn(),
            validateOTP: jest.fn(),
          },
        },
        {
          provide: VerifyUrlService,
          useValue: {
            sendVerifyUrlWithPurpose: jest.fn(),
            validateVerifyUrl: jest.fn(),
            getTTLToken: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {
            createUserInfomation: jest.fn(),
          },
        },
        {
          provide: KafkaService,
          useValue: {
            sendWithTimeout: jest.fn(),
            getClient: jest.fn().mockReturnValue({ emit: mockEmit }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get(PrismaService);
    jwtService = module.get(JwtService);
    otpService = module.get(OtpService);
    verifyUrlService = module.get(VerifyUrlService);
    userService = module.get(UserService);
    kafkaService = module.get(KafkaService);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------------------------------------------------------------------
  // register
  // ---------------------------------------------------------------------------
  describe('register', () => {
    const dto = { username: 'newuser', password: 'pass', email: 'new@example.com' };

    it('creates a user, fires verify-email and user-info creation, returns userId', async () => {
      (prismaService.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(null)  // username check
        .mockResolvedValueOnce(null)  // email check
        .mockResolvedValueOnce(makeUser({ id: 'new-id' })); // check user for email verification
      (prismaService.user.create as jest.Mock).mockResolvedValue(makeUser({ id: 'new-id', email: dto.email, isVerified: false }));
      userService.createUserInfomation.mockResolvedValue(undefined);

      const result = await service.register(dto);

      expect(result).toEqual({ message: 'User created successfully', userId: 'new-id' });
      expect(prismaService.user.create).toHaveBeenCalled();
      expect(verifyUrlService.sendVerifyUrlWithPurpose).toHaveBeenCalled();
      expect(userService.createUserInfomation).toHaveBeenCalledWith('new-id');
    });

    it('throws RpcException when username already exists', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce(makeUser());

      await expect(service.register(dto)).rejects.toThrow(RpcException);
      await expect(service.register(dto)).rejects.toMatchObject(
        expect.objectContaining({ message: expect.stringContaining('') }),
      );
    });

    it('throws RpcException when email already exists', async () => {
      (prismaService.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeUser());

      await expect(service.register(dto)).rejects.toThrow(RpcException);
    });

    it('uses AUTH_ERROR_MESSAGE constants for duplicate-username error', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce(makeUser());

      try {
        await service.register(dto);
      } catch (e) {
        const payload = (e as RpcException).getError() as any;
        expect(payload.message).toBe(AuthErrorMessages.USERNAME_ALREADY_EXISTS);
        expect(payload.status).toBe(HttpStatus.BAD_REQUEST);
      }
    });

    it('uses AUTH_ERROR_MESSAGE constants for duplicate-email error', async () => {
      (prismaService.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeUser());

      try {
        await service.register(dto);
      } catch (e) {
        const payload = (e as RpcException).getError() as any;
        expect(payload.message).toBe(AuthErrorMessages.EMAIL_ALREADY_EXISTS);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // registerOwner
  // ---------------------------------------------------------------------------
  describe('registerOwner', () => {
    const dto = {
      username: 'owneruser',
      password: 'pass',
      email: 'owner@example.com',
      businessName: 'Biz',
      businessPhone: '123',
      businessAddress: 'addr',
      taxId: 'tax',
      proofDocumentUrls: [],
    };

    it('creates owner, creates owner application, emits notifications, returns ids', async () => {
      (prismaService.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeUser({ id: 'owner-id' }));
      (prismaService.user.create as jest.Mock).mockResolvedValue(
        makeUser({ id: 'owner-id', email: dto.email, role: Role.OWNER_PENDING, isVerified: false }),
      );
      userService.createUserInfomation.mockResolvedValue(undefined);
      (kafkaService.sendWithTimeout as jest.Mock).mockResolvedValue({
        ownerApplicationId: 'oa-123',
      });

      const result = await service.registerOwner(dto);

      expect(result).toEqual({
        message: 'Owner application submitted successfully',
        userId: 'owner-id',
        ownerApplicationId: 'oa-123',
      });
      expect(kafkaService.sendWithTimeout).toHaveBeenCalledWith(
        OwnerApplicationTopics.Create,
        expect.objectContaining({ userId: 'owner-id' }),
      );
    });

    it('rolls back user creation and emits delete when owner application fails', async () => {
      (prismaService.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      (prismaService.user.create as jest.Mock).mockResolvedValue(
        makeUser({ id: 'owner-id', email: dto.email }),
      );
      userService.createUserInfomation.mockResolvedValue(undefined);
      (kafkaService.sendWithTimeout as jest.Mock).mockResolvedValue({ ownerApplicationId: null });
      (prismaService.user.delete as jest.Mock).mockResolvedValue(undefined);

      await expect(service.registerOwner(dto)).rejects.toThrow(RpcException);
      expect(prismaService.user.delete).toHaveBeenCalledWith({
        where: { id: 'owner-id' },
      });
    });

    it('throws when username already exists', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce(makeUser());

      await expect(service.registerOwner(dto)).rejects.toThrow(RpcException);
    });
  });

  // ---------------------------------------------------------------------------
  // login
  // ---------------------------------------------------------------------------
  describe('login', () => {
    const dto = { identifier: 'testuser', password: 'correct-pass', rememberMe: false };

    it('returns tokens on successful login', async () => {
      const user = makeUser();
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (prismaService.user.update as jest.Mock).mockResolvedValue(user);

      const result = await service.login(dto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('throws UNAUTHORIZED when user is not found', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      try {
        await service.login(dto);
      } catch (e) {
        const payload = (e as RpcException).getError() as any;
        expect(payload.status).toBe(HttpStatus.UNAUTHORIZED);
        expect(payload.message).toBe('INVALID_USERNAME_OR_EMAIL');
      }
    });

    it('throws UNAUTHORIZED when password is incorrect', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(makeUser());
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      try {
        await service.login(dto);
      } catch (e) {
        const payload = (e as RpcException).getError() as any;
        expect(payload.status).toBe(HttpStatus.UNAUTHORIZED);
        expect(payload.message).toBe('INVALID_PASSWORD');
      }
    });

    it('throws FORBIDDEN with userId when email is not verified', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(makeUser({ isVerified: false }));
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      try {
        await service.login(dto);
      } catch (e) {
        const payload = (e as RpcException).getError() as any;
        expect(payload.status).toBe(HttpStatus.FORBIDDEN);
        expect(payload.message).toBe('EMAIL_NOT_VERIFIED');
        expect(payload.data.userId).toBe('user-id');
      }
    });

    it('throws BAD_REQUEST when identifier is blank', async () => {
      try {
        await service.login({ identifier: '  ', password: 'pass' });
      } catch (e) {
        const payload = (e as RpcException).getError() as any;
        expect(payload.status).toBe(HttpStatus.BAD_REQUEST);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // googleLogin
  // ---------------------------------------------------------------------------
  describe('googleLogin', () => {
    const googleUser = {
      email: 'google@gmail.com',
      firstName: 'First',
      lastName: 'Last',
      picture: 'pic-url',
    };

    it('returns tokens for an existing verified google user', async () => {
      const user = makeUser({ email: googleUser.email, isVerified: true });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-rt');
      (prismaService.user.update as jest.Mock).mockResolvedValue(user);

      const result = await service.googleLogin(googleUser);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(prismaService.user.create).not.toHaveBeenCalled();
    });

    it('creates a new user when google email is not registered', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      const newUser = makeUser({ id: 'new-google-id', email: googleUser.email, isVerified: true });
      (prismaService.user.create as jest.Mock).mockResolvedValue(newUser);
      userService.createUserInfomation.mockResolvedValue(undefined);
      (prismaService.user.update as jest.Mock).mockResolvedValue(newUser);

      const result = await service.googleLogin(googleUser);

      expect(prismaService.user.create).toHaveBeenCalled();
      expect(userService.createUserInfomation).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
    });
  });

  // ---------------------------------------------------------------------------
  // sendOTPWithPurpose
  // ---------------------------------------------------------------------------
  describe('sendOTPWithPurpose', () => {
    it('sends OTP and returns userId when user exists', async () => {
      const user = makeUser();
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);
      otpService.sendOTP.mockResolvedValue(undefined);

      const result = await service.sendOTPWithPurpose('test@example.com', OtpPurpose.FORGOT_PASSWORD);

      expect(otpService.sendOTP).toHaveBeenCalledWith(
        'test@example.com',
        'user-id',
        OtpPurpose.FORGOT_PASSWORD,
      );
      expect(result).toEqual({ userId: 'user-id' });
    });

    it('throws NOT_FOUND when user does not exist', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      try {
        await service.sendOTPWithPurpose('nope@example.com', OtpPurpose.FORGOT_PASSWORD);
      } catch (e) {
        const payload = (e as RpcException).getError() as any;
        expect(payload.status).toBe(HttpStatus.NOT_FOUND);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // validateOTPWithPurpose
  // ---------------------------------------------------------------------------
  describe('validateOTPWithPurpose', () => {
    it('returns a resetToken when OTP is valid', async () => {
      otpService.validateOTP.mockResolvedValue(true);
      jwtService.sign.mockReturnValue('reset-token');

      const result = await service.validateOTPWithPurpose({
        userId: 'uid',
        otp: '123456',
        purpose: OtpPurpose.FORGOT_PASSWORD,
      });

      expect(result).toEqual({ resetToken: 'reset-token' });
    });

    it('throws UNAUTHORIZED when OTP is invalid', async () => {
      otpService.validateOTP.mockResolvedValue(false);

      try {
        await service.validateOTPWithPurpose({
          userId: 'uid',
          otp: 'wrong',
          purpose: OtpPurpose.FORGOT_PASSWORD,
        });
      } catch (e) {
        const payload = (e as RpcException).getError() as any;
        expect(payload.status).toBe(HttpStatus.UNAUTHORIZED);
        expect(payload.message).toBe('Invalid OTP');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // resetPassword
  // ---------------------------------------------------------------------------
  describe('resetPassword', () => {
    it('hashes new password, updates user, and returns success message', async () => {
      (prismaService.user.update as jest.Mock).mockResolvedValue(makeUser());

      const result = await service.resetPassword({ userId: 'uid', newPassword: 'newpass' });

      expect(bcrypt.hash).toHaveBeenCalledWith('newpass', expect.any(Number));
      expect(prismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'uid' } }),
      );
      expect(result).toEqual({ message: 'Password reset successfully' });
    });

    it('propagates unexpected errors via handleServiceErrorCatching', async () => {
      (prismaService.user.update as jest.Mock).mockRejectedValue(new Error('db error'));

      await expect(service.resetPassword({ userId: 'uid', newPassword: 'np' })).rejects.toThrow(
        RpcException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // verifyEmail
  // ---------------------------------------------------------------------------
  describe('verifyEmail', () => {
    it('returns emailNotRegisteredTemplate when user does not exist', async () => {
      jwtService.decode.mockReturnValue({ email: 'unknown@example.com' });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.verifyEmail('some-token');

      expect(typeof result).toBe('string');
      expect(result).toContain('Email Not Registered');
    });

    it('returns alreadyVerifiedTemplate when user is already verified', async () => {
      jwtService.decode.mockReturnValue({ email: 'test@example.com' });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(makeUser({ isVerified: true }));

      const result = await service.verifyEmail('some-token');

      expect(result).toContain('Email Already Verified');
    });

    it('returns failVerifyAccountTemplate when JWT verification fails', async () => {
      jwtService.decode.mockReturnValue({ email: 'test@example.com' });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(makeUser({ isVerified: false }));
      jwtService.verifyAsync.mockRejectedValue(new Error('expired'));

      const result = await service.verifyEmail('expired-token');

      expect(result).toContain('Email Verification Failed');
    });

    it('returns failVerifyAccountTemplate when verifyUrl validation fails', async () => {
      jwtService.decode.mockReturnValue({ email: 'test@example.com' });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(makeUser({ isVerified: false }));
      jwtService.verifyAsync.mockResolvedValue({ email: 'test@example.com' });
      verifyUrlService.validateVerifyUrl.mockResolvedValue(false);

      const result = await service.verifyEmail('bad-token');

      expect(result).toContain('Email Verification Failed');
    });

    it('returns successVerifyAccountTemplate and marks user as verified on success', async () => {
      jwtService.decode.mockReturnValue({ email: 'test@example.com' });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(makeUser({ isVerified: false }));
      jwtService.verifyAsync.mockResolvedValue({ email: 'test@example.com' });
      verifyUrlService.validateVerifyUrl.mockResolvedValue(true);
      (prismaService.user.update as jest.Mock).mockResolvedValue(makeUser({ isVerified: true }));

      const result = await service.verifyEmail('valid-token');

      expect(prismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isVerified: true } }),
      );
      expect(result).toContain('Email Verified Successfully');
    });
  });

  // ---------------------------------------------------------------------------
  // resendVerifyEmail
  // ---------------------------------------------------------------------------
  describe('resendVerifyEmail', () => {
    it('throws BAD_REQUEST when user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.resendVerifyEmail('uid', VerifyUrlPurpose.VERIFY_EMAIL),
      ).rejects.toThrow(RpcException);
    });

    it('throws CONFLICT when user is already verified', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(makeUser({ isVerified: true }));

      try {
        await service.resendVerifyEmail('uid', VerifyUrlPurpose.VERIFY_EMAIL);
      } catch (e) {
        const payload = (e as RpcException).getError() as any;
        expect(payload.status).toBe(HttpStatus.CONFLICT);
      }
    });

    it('throws TOO_MANY_REQUESTS when within resend time limit', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        makeUser({ isVerified: false }),
      );
      verifyUrlService.getTTLToken.mockResolvedValue(3500); // well within 1 hour TTL, only 100s elapsed < 300s limit

      try {
        await service.resendVerifyEmail('uid', VerifyUrlPurpose.VERIFY_EMAIL);
      } catch (e) {
        const payload = (e as RpcException).getError() as any;
        expect(payload.status).toBe(HttpStatus.TOO_MANY_REQUESTS);
      }
    });

    it('sends verify URL and returns success when time limit has passed', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        makeUser({ isVerified: false, email: 'test@example.com' }),
      );
      // TTL expired means we can resend: getTTLToken returns -1
      verifyUrlService.getTTLToken.mockResolvedValue(-1);
      verifyUrlService.sendVerifyUrlWithPurpose.mockResolvedValue(undefined);

      const result = await service.resendVerifyEmail('uid', VerifyUrlPurpose.VERIFY_EMAIL);

      expect(result).toEqual({ message: 'resend email successfully' });
      expect(verifyUrlService.sendVerifyUrlWithPurpose).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // externalResendVerifyEmail
  // ---------------------------------------------------------------------------
  describe('externalResendVerifyEmail', () => {
    it('returns emailNotRegisteredTemplate when user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.externalResendVerifyEmail('uid', VerifyUrlPurpose.VERIFY_EMAIL);

      expect(result).toContain('Email Not Registered');
    });

    it('returns alreadyVerifiedTemplate when user is already verified', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(makeUser({ isVerified: true }));

      const result = await service.externalResendVerifyEmail('uid', VerifyUrlPurpose.VERIFY_EMAIL);

      expect(result).toContain('Email Already Verified');
    });

    it('returns resendTooSoonTemplate when within time limit', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        makeUser({ isVerified: false }),
      );
      verifyUrlService.getTTLToken.mockResolvedValue(3500);

      const result = await service.externalResendVerifyEmail('uid', VerifyUrlPurpose.VERIFY_EMAIL);

      expect(result).toContain('Resend Too Soon');
    });

    it('sends verify URL and returns resendSuccessTemplate', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        makeUser({ isVerified: false }),
      );
      verifyUrlService.getTTLToken.mockResolvedValue(-1);
      verifyUrlService.sendVerifyUrlWithPurpose.mockResolvedValue(undefined);

      const result = await service.externalResendVerifyEmail('uid', VerifyUrlPurpose.VERIFY_EMAIL);

      expect(result).toContain('Verification Link Sent');
    });

    it('returns resendFailedTemplate when an unexpected error occurs', async () => {
      (prismaService.user.findUnique as jest.Mock).mockRejectedValue(new Error('db down'));

      const result = await service.externalResendVerifyEmail('uid', VerifyUrlPurpose.VERIFY_EMAIL);

      expect(result).toContain('Failed to Resend Verification');
    });
  });

  // ---------------------------------------------------------------------------
  // refresh
  // ---------------------------------------------------------------------------
  describe('refresh', () => {
    it('returns new tokens when refresh token is valid', async () => {
      const user = makeUser();
      const exp = Math.floor(Date.now() / 1000) + 3600;
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-id', exp });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (prismaService.user.update as jest.Mock).mockResolvedValue(user);

      const result = await service.refresh('valid-rt');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('throws UNAUTHORIZED RpcException when user is not found', async () => {
      const exp = Math.floor(Date.now() / 1000) + 3600;
      jwtService.verifyAsync.mockResolvedValue({ sub: 'ghost-id', exp });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.refresh('rt')).rejects.toThrow(RpcException);
    });

    it('throws UNAUTHORIZED RpcException when refresh token comparison fails', async () => {
      const exp = Math.floor(Date.now() / 1000) + 3600;
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-id', exp });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(makeUser());
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.refresh('invalid-rt')).rejects.toThrow(RpcException);
    });

    it('throws UNAUTHORIZED with expired-token message when JWT verification throws', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      try {
        await service.refresh('expired-rt');
      } catch (e) {
        const payload = (e as RpcException).getError() as any;
        expect(payload.status).toBe(HttpStatus.UNAUTHORIZED);
        expect(payload.message).toContain('expired');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // approveOwner
  // ---------------------------------------------------------------------------
  describe('approveOwner', () => {
    it('updates role to OWNER and emits approved notification', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(makeUser());
      (prismaService.user.update as jest.Mock).mockResolvedValue(makeUser({ role: Role.OWNER }));

      const result = await service.approveOwner('user-id');

      expect(prismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { role: Role.OWNER } }),
      );
      expect(mockEmit).toHaveBeenCalledWith(
        NotificationTopics.OwnerApplicationApproved,
        expect.objectContaining({ to: 'test@example.com' }),
      );
      expect(result).toEqual({ message: 'Owner approved successfully' });
    });

    it('throws NOT_FOUND when user does not exist', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      try {
        await service.approveOwner('ghost-id');
      } catch (e) {
        const payload = (e as RpcException).getError() as any;
        expect(payload.status).toBe(HttpStatus.NOT_FOUND);
        expect(payload.message).toBe(AuthErrorMessages.USER_NOT_FOUND);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // rejectOwner
  // ---------------------------------------------------------------------------
  describe('rejectOwner', () => {
    it('updates role to USER and emits rejected notification with reason', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(makeUser());
      (prismaService.user.update as jest.Mock).mockResolvedValue(makeUser({ role: Role.USER }));

      const result = await service.rejectOwner('user-id', 'fraud');

      expect(prismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { role: Role.USER } }),
      );
      expect(mockEmit).toHaveBeenCalledWith(
        NotificationTopics.OwnerApplicationRejected,
        expect.objectContaining({ to: 'test@example.com', reason: 'fraud' }),
      );
      expect(result).toEqual({ message: 'Owner rejected successfully' });
    });

    it('throws NOT_FOUND when user does not exist', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.rejectOwner('ghost-id', 'reason')).rejects.toThrow(RpcException);
    });
  });
});
