import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from 'src/dtos/auth.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { ClientKafka, RpcException } from '@nestjs/microservices'
import * as bcrypt from 'bcrypt'
import { UserDto } from 'src/dtos/user.dto';
import { JwtService } from '@nestjs/jwt';
import { OtpService } from './otp.service';
import { ValidateOTPDto } from 'src/dtos/otp.dto';

@Injectable()
export class AuthService {
    constructor(
        private readonly prismaService: PrismaService,
        private readonly jwtService: JwtService,
        private readonly otpService: OtpService,
        @Inject('NOTIFICATION_SERVICE') private readonly notificationClient: ClientKafka
    ) { }

    private generateToken(user: UserDto) {
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

    async register(data: RegisterDto) {
        try {
            //Kiểm tra username đã tồn tại chưa
            const isExistingUsername = await this.prismaService.user.findUnique({ where: { username: data.username } })

            if (isExistingUsername) throw new RpcException({
                status: HttpStatus.BAD_REQUEST,
                message: 'Username already exists'
            })

            //Kiểm tra email đã tồn tại chưa
            const isExistingEmail = await this.prismaService.user.findUnique({ where: { email: data.email } })

            if (isExistingEmail) throw new RpcException({
                status: HttpStatus.BAD_REQUEST,
                message: 'Email already exists'
            })

            //Tạo người dùng mới
            const newUser = await this.prismaService.user.create({
                data: {
                    username: data.username,
                    //Tạo người dùng với mật khẩu mã hóa
                    password: await bcrypt.hash(data.password, Number(process.env.SALT_ROUNDS)),
                    email: data.email
                }
            })

            //Tạo access và refresh token rồi trả về
            const tokens = this.generateToken(newUser)

            await this.prismaService.user.update({
                where: {
                    id: newUser.id
                },
                data: {
                    //Mã hóa refreshToken
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

    async login(data: LoginDto) {
        try {
            //Kiểm tra người dùng có tồn tại trong hệ thống chưa
            const isExistingUser = await this.prismaService.user.findUnique({ where: { username: data.username } })
            if (!isExistingUser) throw new RpcException({
                status: HttpStatus.UNAUTHORIZED,
                message: "Invalid username"
            })

            //Kiểm tra mật khẩu người dùng
            if (!(await bcrypt.compare(data.password, isExistingUser.password))) throw new RpcException({
                status: HttpStatus.UNAUTHORIZED,
                message: "Invalid password"
            })

            //Tạo token mới
            const tokens = this.generateToken(isExistingUser)

            await this.prismaService.user.update({
                where: {
                    id: isExistingUser.id
                },
                data: {
                    //Mã hóa refreshToken
                    refreshToken: await bcrypt.hash(isExistingUser.refreshToken, Number(process.env.SALT_ROUNDS))
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
                //Tạo mật khẩu ngẫu nhiên cho người dùng
                const hashPassword = await bcrypt.hash(`${process.env.GOOGLE_AUTH_PASSWORD_DEFAULT}${Math.floor(Math.random() * 1000000)}`, Number(process.env.SALT_ROUNDS))

                //Tạo người dùng mới
                googleUser = await this.prismaService.user.create({
                    data: {
                        username: user.email.split('@')[0], //Chỉ lấy phần tên trước @
                        email: user.email,
                        password: hashPassword
                    }
                })
            }

            const tokens = this.generateToken(googleUser)

            await this.prismaService.user.update({
                where: {
                    id: googleUser.id
                },
                data: {
                    //Mã hóa refreshToken
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

    async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
        try {
            const isExistingUser = await this.prismaService.user.findUnique({ where: { email: forgotPasswordDto.email } })

            if (!isExistingUser) throw new RpcException({
                status: HttpStatus.NOT_FOUND,
                message: 'User with this email does not exist'
            })

            const otp = await this.otpService.generateOTP({
                userId: isExistingUser.id,
                purpose: 'forgot-password'
            })

            this.notificationClient.emit('notification.forgot-password', { to: forgotPasswordDto.email, code: otp })

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

    async validateForgotPasswordOTP(data: (Omit<ValidateOTPDto, 'purpose'>)) {
        try {
            //Check if OTP is correct
            if (await this.otpService.validateOTP({
                userId: data.userId,
                otp: data.otp,
                purpose: 'forgot-password'
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
}
