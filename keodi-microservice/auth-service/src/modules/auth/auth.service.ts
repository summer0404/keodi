import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { RpcException } from '@nestjs/microservices';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';
import { PrismaService } from 'src/database/prisma.service';
import { UserService } from 'src/modules/user/user.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { AuthErrorMessages } from 'src/shared/constants/error.constant';
import { OWNER_APPLICATION_REVIEW_DAYS } from 'src/shared/constants/owner.constant';
import {
  NotificationTopics,
  OwnerApplicationTopics,
  UserTopics,
} from 'src/shared/constants/topic.constant';
import {
  LoginDto,
  RegisterDto,
  RegisterOwnerDto,
  ResetPasswordDto,
} from 'src/shared/dtos/auth.dto';
import { ValidateOTPDto } from 'src/shared/dtos/otp.dto';
import { UserDto } from 'src/shared/dtos/user.dto';
import { VerifyUrlPurpose } from 'src/shared/enums/verifyUrl.enum';
import {
  resendFailedTemplate,
  resendSuccessTemplate,
  resendTooSoonTemplate,
} from 'src/shared/templates/resend-verify-email-response.template';
import {
  alreadyVerifiedTemplate,
  emailNotRegisteredTemplate,
  failVerifyAccountTemplate,
  successVerifyAccountTemplate,
} from 'src/shared/templates/verify-email-response.template';
import { handleServiceErrorCatching } from 'src/shared/utils/error.helper';
import { timeLimitResend } from 'src/shared/utils/time-limit-resend';
import { getTTLForPurpose } from 'src/shared/utils/ttl-redis.helper';
import { OtpService } from './otp.service';
import { VerifyUrlService } from './verifyUrl.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
    private readonly verifyUrlService: VerifyUrlService,
    private readonly userService: UserService,
    private readonly kafkaService: KafkaService,
  ) {}

  private generateAccessAndRefreshToken(
    user: UserDto,
    rememberMe = false,
    refreshExpiresIn?: StringValue,
  ) {
    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: '10m' }),
      refreshToken: this.jwtService.sign(payload, {
        expiresIn: refreshExpiresIn ?? (rememberMe ? '365d' : '7d'),
      } as JwtSignOptions),
    };
  }

  private async timeWaitingToResend(
    email: string,
    purpose: string,
  ): Promise<number> {
    const ttl = await this.verifyUrlService.getTTLToken(email, purpose);

    if (ttl < 0) return 0;

    if (getTTLForPurpose(purpose) - ttl >= timeLimitResend(purpose)) return 0;

    return timeLimitResend(purpose) - (getTTLForPurpose(purpose) - ttl);
  }

  private async sendVerifyUrlWithPurpose(email: string, purpose: string) {
    const token = this.jwtService.sign({ email }, { expiresIn: '1h' });

    this.verifyUrlService.sendVerifyUrlWithPurpose(email, token, purpose);
  }

  async register(data: RegisterDto) {
    try {
      const isExistingUsername = await this.prismaService.user.findUnique({
        where: { username: data.username },
      });

      if (isExistingUsername)
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: AuthErrorMessages.USERNAME_ALREADY_EXISTS,
        });

      const isExistingEmail = await this.prismaService.user.findUnique({
        where: { email: data.email },
      });

      if (isExistingEmail)
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: AuthErrorMessages.EMAIL_ALREADY_EXISTS,
        });

      const newUser = await this.prismaService.user.create({
        data: {
          username: data.username,
          password: await bcrypt.hash(
            data.password,
            Number(process.env.SALT_ROUNDS),
          ),
          email: data.email,
          role: Role.USER,
        },
      });

      this.sendEmailVerifyUrl(newUser.email, VerifyUrlPurpose.VERIFY_EMAIL);
      this.userService.createUserInfomation(newUser.id);

      return { message: 'User created successfully', userId: newUser.id };
    } catch (error) {
      handleServiceErrorCatching(error);
    }
  }

  async registerOwner(data: RegisterOwnerDto) {
    try {
      const isExistingUsername = await this.prismaService.user.findUnique({
        where: { username: data.username },
      });

      if (isExistingUsername)
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: AuthErrorMessages.USERNAME_ALREADY_EXISTS,
        });

      const isExistingEmail = await this.prismaService.user.findUnique({
        where: { email: data.email },
      });

      if (isExistingEmail)
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: AuthErrorMessages.EMAIL_ALREADY_EXISTS,
        });

      const newOwner = await this.prismaService.user.create({
        data: {
          username: data.username,
          password: await bcrypt.hash(
            data.password,
            Number(process.env.SALT_ROUNDS),
          ),
          email: data.email,
          role: Role.OWNER_PENDING,
        },
      });

      let ownerApplicationId: string | undefined;

      try {
        await this.userService.createUserInfomation(newOwner.id);

        const ownerApplication = await this.kafkaService.sendWithTimeout(
          OwnerApplicationTopics.Create,
          {
            userId: newOwner.id,
            businessName: data.businessName,
            businessPhone: data.businessPhone,
            businessAddress: data.businessAddress,
            taxId: data.taxId,
            businessWebsite: data.businessWebsite,
            proofDocumentUrls: data.proofDocumentUrls,
          },
        );

        ownerApplicationId = ownerApplication?.ownerApplicationId;

        if (!ownerApplicationId)
          throw new RpcException({
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            message: AuthErrorMessages.OWNER_APPLICATION_CREATE_FAILED,
          });
      } catch (error) {
        await this.prismaService.user.delete({
          where: {
            id: newOwner.id,
          },
        });
        this.kafkaService
          .getClient()
          .emit(UserTopics.Delete, { userId: newOwner.id });
        throw error;
      }

      this.sendEmailVerifyUrl(newOwner.email, VerifyUrlPurpose.VERIFY_EMAIL);

      this.kafkaService
        .getClient()
        .emit(NotificationTopics.OwnerApplicationReceived, {
          to: newOwner.email,
          businessDays: OWNER_APPLICATION_REVIEW_DAYS,
        });

      return {
        message: 'Owner application submitted successfully',
        userId: newOwner.id,
        ownerApplicationId,
      };
    } catch (error) {
      handleServiceErrorCatching(error);
    }
  }

  async login(data: LoginDto) {
    try {
      const loginIdentifier = data.identifier.trim();

      if (!loginIdentifier)
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'USERNAME_OR_EMAIL_REQUIRED',
        });

      const existingUser = await this.prismaService.user.findFirst({
        where: {
          OR: [{ username: loginIdentifier }, { email: loginIdentifier }],
        },
      });
      if (!existingUser)
        throw new RpcException({
          status: HttpStatus.UNAUTHORIZED,
          message: 'INVALID_USERNAME_OR_EMAIL',
        });

      if (!(await bcrypt.compare(data.password, existingUser.password)))
        throw new RpcException({
          status: HttpStatus.UNAUTHORIZED,
          message: 'INVALID_PASSWORD',
        });

      if (!existingUser.isVerified)
        throw new RpcException({
          status: HttpStatus.FORBIDDEN,
          message: 'EMAIL_NOT_VERIFIED',
          data: {
            userId: existingUser.id,
          },
        });

      const tokens = this.generateAccessAndRefreshToken(
        existingUser,
        data.rememberMe,
      );

      await this.prismaService.user.update({
        where: {
          id: existingUser.id,
        },
        data: {
          refreshToken: await bcrypt.hash(
            tokens.refreshToken,
            Number(process.env.SALT_ROUNDS),
          ),
        },
      });

      return tokens;
    } catch (error) {
      handleServiceErrorCatching(error);
    }
  }

  async googleLogin(user: any) {
    try {
      let googleUser: UserDto | null = await this.prismaService.user.findUnique(
        { where: { email: user.email } },
      );

      if (!googleUser) {
        const hashPassword = await bcrypt.hash(
          `${process.env.GOOGLE_AUTH_PASSWORD_DEFAULT}${Math.floor(Math.random() * 1000000)}`,
          Number(process.env.SALT_ROUNDS),
        );

        googleUser = await this.prismaService.user.create({
          data: {
            username: user.email.split('@')[0],
            email: user.email,
            password: hashPassword,
            isVerified: true,
          },
        });

        await this.userService.createUserInfomation(
          googleUser.id,
          googleUser.username,
          user.firstName,
          user.lastName,
          user.picture,
        );
      }

      const tokens = this.generateAccessAndRefreshToken(googleUser);

      await this.prismaService.user.update({
        where: {
          id: googleUser.id,
        },
        data: {
          refreshToken: await bcrypt.hash(
            tokens.refreshToken,
            Number(process.env.SALT_ROUNDS),
          ),
        },
      });

      return tokens;
    } catch (error) {
      handleServiceErrorCatching(error);
    }
  }

  async sendOTPWithPurpose(email: string, purpose: string) {
    try {
      const isExistingUser = await this.prismaService.user.findUnique({
        where: { email },
      });

      if (!isExistingUser)
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'User with this email does not exist',
        });

      await this.otpService.sendOTP(email, isExistingUser.id, purpose);

      return { userId: isExistingUser.id };
    } catch (error) {
      handleServiceErrorCatching(error);
    }
  }

  async sendEmailVerifyUrl(email: string, purpose: string) {
    try {
      const isExistingUser = await this.prismaService.user.findUnique({
        where: { email },
      });

      if (!isExistingUser)
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'User with this email does not exist',
        });

      this.sendVerifyUrlWithPurpose(email, purpose);

      return { message: 'Verification email has sent' };
    } catch (error) {
      handleServiceErrorCatching(error);
    }
  }

  async validateOTPWithPurpose(data: ValidateOTPDto) {
    try {
      //Check if OTP is correct
      if (
        await this.otpService.validateOTP({
          userId: data.userId,
          otp: data.otp,
          purpose: data.purpose,
        })
      ) {
        //If correct: return a temporary token for user to reset
        const payload = { sub: data.userId };
        return {
          resetToken: this.jwtService.sign(payload, { expiresIn: '10m' }),
        };
      } else {
        //If incorrect: throw error
        throw new RpcException({
          status: HttpStatus.UNAUTHORIZED,
          message: 'Invalid OTP',
        });
      }
    } catch (error) {
      handleServiceErrorCatching(error);
    }
  }

  async resetPassword(data: ResetPasswordDto) {
    try {
      //update new password
      await this.prismaService.user.update({
        where: {
          id: data.userId,
        },
        data: {
          password: await bcrypt.hash(
            data.newPassword,
            Number(process.env.SALT_ROUNDS),
          ),
        },
      });

      return { message: 'Password reset successfully' };
    } catch (error) {
      handleServiceErrorCatching(error);
    }
  }

  async verifyEmail(token: string) {
    try {
      const validPayload = this.jwtService.decode(token);

      const existUser = await this.prismaService.user.findUnique({
        where: { email: validPayload.email },
      });

      if (!existUser) return emailNotRegisteredTemplate();

      if (existUser.isVerified) return alreadyVerifiedTemplate();

      try {
        await this.jwtService.verifyAsync(token, {
          secret: process.env.JWT_SECRET,
        });
      } catch (error) {
        return failVerifyAccountTemplate(existUser.id);
      }

      if (
        !(await this.verifyUrlService.validateVerifyUrl({
          email: validPayload.email,
          purpose: VerifyUrlPurpose.VERIFY_EMAIL,
          token,
        }))
      )
        return failVerifyAccountTemplate(existUser.id);

      await this.prismaService.user.update({
        where: { id: existUser.id },
        data: { isVerified: true },
      });

      return successVerifyAccountTemplate();
    } catch (error) {
      handleServiceErrorCatching(error);
    }
  }

  async externalResendVerifyEmail(userId: string, purpose: string) {
    try {
      const existingUser = await this.prismaService.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser) return emailNotRegisteredTemplate();

      if (existingUser.isVerified) return alreadyVerifiedTemplate();

      //Time limit resend
      const timeHaveToWaitToResend: number = await this.timeWaitingToResend(
        existingUser.email,
        purpose,
      );
      if (timeHaveToWaitToResend > 0)
        return resendTooSoonTemplate(timeHaveToWaitToResend, userId);

      await this.sendVerifyUrlWithPurpose(existingUser.email, purpose);

      return resendSuccessTemplate();
    } catch (error) {
      this.logger.error(error.message ?? error, error.stack);
      return resendFailedTemplate();
    }
  }

  async resendVerifyEmail(userId: string, purpose: string) {
    try {
      const existingUser = await this.prismaService.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser)
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'User not found',
        });

      if (existingUser.isVerified)
        throw new RpcException({
          status: HttpStatus.CONFLICT,
          message: 'Account already verified',
        });

      const timeHaveToWaitToResend: number = await this.timeWaitingToResend(
        existingUser.email,
        purpose,
      );
      if (timeHaveToWaitToResend > 0)
        throw new RpcException({
          status: HttpStatus.TOO_MANY_REQUESTS,
          message: `Too many request, please wait ${timeHaveToWaitToResend} seconds to resend`,
        });

      await this.sendVerifyUrlWithPurpose(existingUser.email, purpose);

      return { message: 'resend email successfully' };
    } catch (error) {
      handleServiceErrorCatching(error);
    }
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken);

      const user = await this.prismaService.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user)
        throw new RpcException({
          status: HttpStatus.UNAUTHORIZED,
          message: 'User not found',
        });

      const isValid = await bcrypt.compare(refreshToken, user.refreshToken);
      if (!isValid)
        throw new RpcException({
          status: HttpStatus.UNAUTHORIZED,
          message: 'Invalid refresh token',
        });

      const remainingSeconds = payload.exp - Math.floor(Date.now() / 1000);
      const tokens = this.generateAccessAndRefreshToken(
        user,
        false,
        `${remainingSeconds}s` as StringValue,
      );

      await this.prismaService.user.update({
        where: { id: user.id },
        data: {
          refreshToken: await bcrypt.hash(
            tokens.refreshToken,
            Number(process.env.SALT_ROUNDS),
          ),
        },
      });
      return tokens;
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      this.logger.error(error.message ?? error, error.stack);
      throw new RpcException({
        status: HttpStatus.UNAUTHORIZED,
        message: 'Invalid or expired refresh token',
      });
    }
  }

  async approveOwner(userId: string) {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
      });

      if (!user)
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: AuthErrorMessages.USER_NOT_FOUND,
        });

      await this.prismaService.user.update({
        where: { id: user.id },
        data: {
          role: Role.OWNER,
        },
      });

      this.kafkaService
        .getClient()
        .emit(NotificationTopics.OwnerApplicationApproved, {
          to: user.email,
        });

      return { message: 'Owner approved successfully' };
    } catch (error) {
      handleServiceErrorCatching(error);
    }
  }

  async rejectOwner(userId: string, reason: string) {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
      });

      if (!user)
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: AuthErrorMessages.USER_NOT_FOUND,
        });

      await this.prismaService.user.update({
        where: { id: user.id },
        data: {
          role: Role.USER,
        },
      });

      this.kafkaService
        .getClient()
        .emit(NotificationTopics.OwnerApplicationRejected, {
          to: user.email,
          reason,
        });

      return { message: 'Owner rejected successfully' };
    } catch (error) {
      handleServiceErrorCatching(error);
    }
  }
}
