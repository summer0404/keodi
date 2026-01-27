import { HttpStatus, Injectable } from '@nestjs/common';
import { LoginDto, RegisterDto, ResetPasswordDto } from 'src/common/dtos/auth.dto';
import { RpcException } from '@nestjs/microservices'
import * as bcrypt from 'bcrypt'
import { UserDto } from 'src/common/dtos/user.dto';
import { JwtService } from '@nestjs/jwt';
import { OtpService } from './otp.service';
import { ValidateOTPDto } from 'src/common/dtos/otp.dto';
import { VerifyUrlService } from './verifyUrl.service';
import { VerifyUrlPurpose } from 'src/common/enums/verifyUrl.enum';
import {
    alreadyVerifiedTemplate,
    emailNotRegisteredTemplate,
    failVerifyAccountTemplate,
    successVerifyAccountTemplate
} from 'src/common/templates/verify-email-response.template';
import {
    resendFailedTemplate,
    resendSuccessTemplate,
    resendTooSoonTemplate
} from 'src/common/templates/resend-verify-email-response.template';
import { getTTLForPurpose } from 'src/common/utils/ttl-redis.helper';
import { timeLimitResend } from 'src/common/utils/time-limit-resend';
import { UserService } from 'src/modules/user/user.service';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class AuthService {
    constructor(
        private readonly prismaService: PrismaService,
        private readonly jwtService: JwtService,
        private readonly otpService: OtpService,
        private readonly verifyUrlService: VerifyUrlService,
        private readonly userService: UserService
    ) { }

    private generateAccessAndRefreshToken(user: UserDto) {
        const payload = {
            sub: user.id,
            email: user.email,
            username: user.username
        }

        return {
            accessToken: this.jwtService.sign(payload, { expiresIn: '10m' }),
            refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' })
        }
    }

    private async timeWaitingToResend(email: string, purpose: string): Promise<number> {
        const ttl = await this.verifyUrlService.getTTLToken(email, purpose)

        if (ttl < 0) return 0

        if (getTTLForPurpose(purpose) - ttl >= timeLimitResend(purpose)) return 0

        return timeLimitResend(purpose) - (getTTLForPurpose(purpose) - ttl)
    }

    private async sendVerifyUrlWithPurpose(email: string, purpose: string) {
        const token = this.jwtService.sign({ email }, { expiresIn: '1h' })

        this.verifyUrlService.sendVerifyUrlWithPurpose(email, token, purpose)
    }

    async register(data: RegisterDto) {
        try {
            const isExistingUsername = await this.prismaService.user.findUnique({ where: { username: data.username } })

            if (isExistingUsername) throw new RpcException({
                status: HttpStatus.BAD_REQUEST,
                message: 'Username already exists'
            })

            const isExistingEmail = await this.prismaService.user.findUnique({ where: { email: data.email } })

            if (isExistingEmail) throw new RpcException({
                status: HttpStatus.BAD_REQUEST,
                message: 'Email already exists'
            })

            const newUser = await this.prismaService.user.create({
                data: {
                    username: data.username,
                    password: await bcrypt.hash(data.password, Number(process.env.SALT_ROUNDS)),
                    email: data.email
                }
            })

            this.sendEmailVerifyUrl(newUser.email, VerifyUrlPurpose.VERIFY_EMAIL)
            this.userService.createUserInfomation(newUser.id)

            return { message: 'User created successfully' }
        } catch (error) {
            console.error(error)
            if (error instanceof RpcException) {
                throw error;
            }
            throw new RpcException({
                status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
                message: error.message ?? error
            })
        }
    }

    async login(data: LoginDto) {
        try {
            const existingUser = await this.prismaService.user.findUnique({ where: { username: data.username } })
            if (!existingUser) throw new RpcException({
                status: HttpStatus.UNAUTHORIZED,
                message: "Invalid username"
            })

            if (!(await bcrypt.compare(data.password, existingUser.password))) throw new RpcException({
                status: HttpStatus.UNAUTHORIZED,
                message: "Invalid password"
            })


            if (!existingUser.isVerified) throw new RpcException({
                status: HttpStatus.FORBIDDEN,
                message: "Email has not been verified",
                data: {
                    userId: existingUser.id
                }
            })

            const tokens = this.generateAccessAndRefreshToken(existingUser)

            await this.prismaService.user.update({
                where: {
                    id: existingUser.id
                },
                data: {
                    refreshToken: await bcrypt.hash(tokens.refreshToken, Number(process.env.SALT_ROUNDS))
                }
            })

            return tokens
        } catch (error) {
            console.error(error)
            if (error instanceof RpcException) {
                throw error;
            }
            throw new RpcException({
                status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
                message: error.message ?? error
            })
        }
    }

    async googleCallback(user: any) {
        try {
            let googleUser: UserDto | null = await this.prismaService.user.findUnique({ where: { username: user.email } })

            if (!googleUser) {
                const hashPassword = await bcrypt.hash(`${process.env.GOOGLE_AUTH_PASSWORD_DEFAULT}${Math.floor(Math.random() * 1000000)}`, Number(process.env.SALT_ROUNDS))

                googleUser = await this.prismaService.user.create({
                    data: {
                        username: user.email.split('@')[0],
                        email: user.email,
                        password: hashPassword,
                        isVerified: true
                    }
                })

                this.userService.createUserInfomation(
                    googleUser.id,
                    user.firstName,
                    user.lastName,
                    user.picture
                )
            }

            const tokens = this.generateAccessAndRefreshToken(googleUser)

            await this.prismaService.user.update({
                where: {
                    id: googleUser.id
                },
                data: {
                    refreshToken: await bcrypt.hash(tokens.refreshToken, Number(process.env.SALT_ROUNDS))
                }
            })

            return tokens
        } catch (error) {
            console.error(error)
            if (error instanceof RpcException) {
                throw error;
            }
            throw new RpcException({
                status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
                message: error.message ?? error
            })
        }
    }

    async sendOTPWithPurpose(email: string, purpose: string) {
        try {
            const isExistingUser = await this.prismaService.user.findUnique({ where: { email } })

            if (!isExistingUser) throw new RpcException({
                status: HttpStatus.NOT_FOUND,
                message: 'User with this email does not exist'
            })

            await this.otpService.sendOTP(email, isExistingUser.id, purpose)

            return { userId: isExistingUser.id }
        } catch (error) {
            console.error(error)
            if (error instanceof RpcException) {
                throw error;
            }
            throw new RpcException({
                status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
                message: error.message ?? error
            })
        }
    }

    async sendEmailVerifyUrl(email: string, purpose: string) {
        try {
            const isExistingUser = await this.prismaService.user.findUnique({ where: { email } })

            if (!isExistingUser) throw new RpcException({
                status: HttpStatus.NOT_FOUND,
                message: 'User with this email does not exist'
            })

            this.sendVerifyUrlWithPurpose(email, purpose)

            return { message: "Verification email has sent" }
        } catch (error) {
            console.error(error)
            if (error instanceof RpcException) {
                throw error;
            }
            throw new RpcException({
                status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
                message: error.message ?? error
            })
        }
    }

    async validateOTPWithPurpose(data: ValidateOTPDto) {
        try {
            //Check if OTP is correct
            if (await this.otpService.validateOTP({
                userId: data.userId,
                otp: data.otp,
                purpose: data.purpose
            })) {
                //If correct: return a temporary token for user to reset
                const payload = { sub: data.userId }
                return {
                    resetToken: this.jwtService.sign(payload, { expiresIn: '10m' })
                }
            } else {
                //If incorrect: throw error
                throw new RpcException({
                    status: HttpStatus.UNAUTHORIZED,
                    message: 'Invalid OTP'
                })
            }
        } catch (error) {
            console.error(error)
            if (error instanceof RpcException) {
                throw error;
            }
            throw new RpcException({
                status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
                message: error.message ?? error
            })
        }
    }

    async resetPassword(data: ResetPasswordDto) {
        try {

            //update new password
            await this.prismaService.user.update({
                where: {
                    id: data.userId
                },
                data: {
                    password: await bcrypt.hash(data.newPassword, Number(process.env.SALT_ROUNDS))
                }
            })

            return { message: 'Password reset successfully' }
        } catch (error) {
            console.error(error)
            if (error instanceof RpcException) {
                throw error;
            }
            throw new RpcException({
                status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
                message: error.message ?? error
            })
        }
    }

    async verifyEmail(token: string) {
        try {
            const validPayload = this.jwtService.decode(token)

            const existUser = await this.prismaService.user.findUnique({ where: { email: validPayload.email } })

            if (!existUser) return emailNotRegisteredTemplate()

            if (existUser.isVerified) return alreadyVerifiedTemplate()

            try {
                await this.jwtService.verifyAsync(token, { secret: process.env.JWT_SECRET })
            } catch (error) {
                return failVerifyAccountTemplate(existUser.id)
            }

            if (!(await this.verifyUrlService.validateVerifyUrl({
                email: validPayload.email,
                purpose: VerifyUrlPurpose.VERIFY_EMAIL,
                token
            })))
                return failVerifyAccountTemplate(existUser.id)

            await this.prismaService.user.update({
                where: { id: existUser.id },
                data: { isVerified: true }
            })

            return successVerifyAccountTemplate()
        } catch (error) {
            console.error(error)
            if (error instanceof RpcException) {
                throw error;
            }
            throw new RpcException({
                status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
                message: error.message ?? error
            })
        }
    }

    async externalResendVerifyEmail(userId: string, purpose: string) {
        try {
            const existingUser = await this.prismaService.user.findUnique({ where: { id: userId } })

            if (!existingUser) return emailNotRegisteredTemplate()

            if (existingUser.isVerified) return alreadyVerifiedTemplate()

            //Time limit resend
            const timeHaveToWaitToResend: number = await this.timeWaitingToResend(existingUser.email, purpose)
            if (timeHaveToWaitToResend > 0) return resendTooSoonTemplate(timeHaveToWaitToResend, userId)

            await this.sendVerifyUrlWithPurpose(existingUser.email, purpose)

            return resendSuccessTemplate()

        } catch (error) {
            console.log(error)
            return resendFailedTemplate()
        }
    }

    async resendVerifyEmail(userId: string, purpose: string) {
        try {
            const existingUser = await this.prismaService.user.findUnique({ where: { id: userId } })

            if (!existingUser) throw new RpcException({
                status: HttpStatus.BAD_REQUEST,
                message: "User not found"
            })

            if (existingUser.isVerified) throw new RpcException({
                status: HttpStatus.CONFLICT,
                message: "Account already verified"
            })

            const timeHaveToWaitToResend: number = await this.timeWaitingToResend(existingUser.email, purpose)
            if (timeHaveToWaitToResend > 0) throw new RpcException({
                status: HttpStatus.TOO_MANY_REQUESTS,
                message: `Too many request, please wait ${timeHaveToWaitToResend} seconds to resend`
            })

            await this.sendVerifyUrlWithPurpose(existingUser.email, purpose)

            return { message: "resend email successfully" }
        } catch (error) {
            console.error(error)
            if (error instanceof RpcException) {
                throw error;
            }
            throw new RpcException({
                status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
                message: error.message ?? error
            })
        }
    }
}
