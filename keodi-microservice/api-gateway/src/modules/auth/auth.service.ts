import { Inject, Injectable, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import { Response } from 'express';
import { firstValueFrom } from 'rxjs';
import {
    ForgotPasswordOTPDto,
    LoginDto,
    RegisterDto,
    ResetPasswordDto,
    ResetPasswordOTPDto,
    ValidateOTPDto
} from 'src/common/dtos/auth.dto';
import { CurrentUserDto } from 'src/common/dtos/user.dto';

@Injectable()
export class AuthService {
    constructor(
        @Inject('KAFKA_SERVICE') private client: ClientKafka,
        private readonly configService: ConfigService
    ) { }

    async register(body: RegisterDto) {
        try {
            return await firstValueFrom(this.client.send('auth.register', body))
        } catch (error) {
            throw error
        }
    }

    async login(@Res({ passthrough: true }) res: Response, body: LoginDto) {
        try {
            const response = await firstValueFrom(this.client.send('auth.login', body))

            res.cookie('refreshToken', response.refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'none',
                maxAge: 7 * 24 * 60 * 60 * 1000
            })

            return {
                accessToken: response.accessToken
            }
        } catch (error) {
            throw error
        }
    }


    async googleCallback(@Res({ passthrough: true }) res: Response, user: any) {
        try {
            const response = await firstValueFrom(this.client.send('auth.google', user))

            res.cookie('refreshToken', response.refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'none',
                maxAge: 7 * 24 * 60 * 60 * 1000
            })

            return res.redirect(`${this.configService.get<string>('FRONTEND_URL')}/auth-google`)
        } catch (error) {
            throw error
        }
    }

    async forgotPasswordOTP(body: ForgotPasswordOTPDto) {
        try {
            return await firstValueFrom(this.client.send('auth.forgot-password-otp', body))
        } catch (error) {
            throw error
        }
    }

    async resetPasswordOTP(body: ResetPasswordOTPDto) {
        try {
            return await firstValueFrom(this.client.send('auth.reset-password-otp', body))
        } catch (error) {
            throw error
        }
    }

    async validateOtp(body: ValidateOTPDto, purpose: string) {
        try {
            return await firstValueFrom(this.client.send('auth.validate-otp', { ...body, purpose }))
        } catch (error) {
            throw error
        }
    }

    async resetPassword(body: (ResetPasswordDto & { userId: number })) {
        try {
            return await firstValueFrom(this.client.send('auth.reset-password', body))
        } catch (error) {
            throw error
        }
    }

    async verifyEmail(token: string) {
        try {
            return await firstValueFrom(this.client.send('auth.verify-email', { token }))
        } catch (error) {
            throw error
        }
    }

    async externalResendVerifyEmail(userId: number) {
        try {
            return await firstValueFrom(this.client.send('auth.external-resend-verify-email', { userId }))
        } catch (error) {
            throw error
        }
    }

    async resendVerifyEmail(userId: number){
        try {
            return await firstValueFrom(this.client.send('auth.resend-verify-email', { userId }))
        } catch (error) {
            throw error
        }
    }

    async me (user: CurrentUserDto) {
        try {
            const userInfo = await firstValueFrom(this.client.send('user.get', { userId: user.id }))

            return {
                ...userInfo,
                ...user
            }
        } catch (error) {
            throw error
        }  
    }
}
