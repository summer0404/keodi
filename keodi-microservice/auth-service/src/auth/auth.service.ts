import { HttpStatus, Injectable } from '@nestjs/common';
import { LoginDto, RegisterDto } from 'src/dtos/auth.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { RpcException } from '@nestjs/microservices'
import * as bcrypt from 'bcrypt'
import { UserDto } from 'src/dtos/user.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
    constructor(
        private readonly prismaService: PrismaService,
        private readonly jwtService: JwtService
    ) { }

    private generateToken(user: UserDto) {
        const payload = {
            sub: user.id,
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
                const hashPassword = await bcrypt.hash(`${process.env.GOOGLE_AUTH_PASSWORD_DEFAULT}${Math.floor(Math.random() * 1000000)}`,Number(process.env.SALT_ROUNDS))

                //Tạo người dùng mới
                googleUser = await this.prismaService.user.create({
                    data: {
                        username: user.email,
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
}
