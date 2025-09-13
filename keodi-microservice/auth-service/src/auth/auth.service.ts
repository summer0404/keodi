import { HttpStatus, Injectable } from '@nestjs/common';
import { RegisterDto } from 'src/dtos/auth.dto';
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
                message: 'This username has been existing'
            })

            //Mã hóa password
            const hashedPassword = await bcrypt.hash(data.password, Number(process.env.SALT_ROUNDS))

            //Tạo người dùng mới
            const newUser = await this.prismaService.user.create({
                data: {
                    username: data.username,
                    password: hashedPassword,
                    email: data.email
                }
            })

            //Tạo access và refresh token rồi trả về
            return this.generateToken(newUser)

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
