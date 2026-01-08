import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserService {
    constructor(private readonly prismaService: PrismaService) { }

    async unverifyUser(userId: number) {
        try {
            const existingUser = await this.prismaService.user.findUnique({ where: { id: Number(userId) } })

            if (!existingUser) throw new RpcException({
                status: HttpStatus.BAD_REQUEST,
                message: 'User not found'
            })

            if (existingUser.isVerify) await this.prismaService.user.update({
                where: {
                    id: existingUser.id
                },
                data: {
                    isVerify: false
                }
            })

            return { message: "User unverified successfully" }
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
    
    async updateUsername(userId: number, newUsername: string) {
        try {

            const existingUsername = await this.prismaService.user.findUnique({ where: { username: newUsername } })
            if (existingUsername) throw new RpcException({
                status: HttpStatus.BAD_REQUEST,
                message: 'Username already used'
            })

            const existingUser = await this.prismaService.user.findUnique({ where: { id: Number(userId) } })
            if (!existingUser) throw new RpcException({
                status: HttpStatus.BAD_REQUEST,
                message: 'User not found'
            })

            await this.prismaService.user.update({
                where: {
                    id: existingUser.id
                },
                data: {
                    username: newUsername
                }
            })
            
            return { message: "Username updated successfully" }
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
