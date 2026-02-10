import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { UpdateUserProfileDto } from 'src/common/dtos/user.dto';
import { PrismaService } from 'src/database/prisma.service';
import { ImageService } from 'src/modules/image/image.service';

@Injectable()
export class UserService {
    constructor(
        private readonly prismaService: PrismaService,
        private readonly imageService: ImageService
    ) { }

    async getAll() {
        try {
            return await this.prismaService.user.findMany({
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phoneNumber: true,
                    pictureUrl: true,
                },
            });
        } catch (error) {
            console.error(error);
            throw new RpcException({
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: error.message ?? error,
            });
        }
    }

    async create(userId: string) {
        try {
            await this.prismaService.user.create({
                data: { id: userId }
            })
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

    async updatePicture(
        file: Buffer,
        userId: string,
        type?: string
    ) {
        try {
            const existingUser = await this.prismaService.user.findUnique({ where: { id: userId } })

            if (!existingUser) throw new RpcException({
                status: HttpStatus.BAD_REQUEST,
                message: 'User not found'
            })

            const image = await this.imageService.updateUserProfilePicture(
                existingUser.id,
                file,
                type
            );

            if (!existingUser.pictureUrl || existingUser.pictureUrl !== image.url) {
                await this.prismaService.user.update({
                    where: {
                        id: existingUser.id
                    },
                    data: {
                        pictureUrl: image.url
                    }
                })
            }

            return { message: "Profile picture updated successfully" }

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

    async getById(userId: string) {
        try {
            const user = await this.prismaService.user.findUnique({ where: { id: userId } })
            if (!user) throw new RpcException({
                status: HttpStatus.BAD_REQUEST,
                message: 'User not found'
            })

            const pictureUrl = user.pictureUrl ? await this.imageService.getImageViewUrl(user.pictureUrl) : null;

            return {
                ...user,
                pictureUrl
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

    async updateProfile(
        userId: string,
        data: UpdateUserProfileDto
    ) {
        try {
            const existingUser = await this.prismaService.user.findUnique({ where: { id: userId } })
            if (!existingUser) throw new RpcException({
                status: HttpStatus.BAD_REQUEST,
                message: 'User not found'
            })

            if (data.phoneNumber) {
                const userWithPhoneNumber = await this.prismaService.user.findUnique({
                    where: { phoneNumber: data.phoneNumber }
                })

                if (userWithPhoneNumber && userWithPhoneNumber.id !== existingUser.id) {
                    throw new RpcException({
                        status: HttpStatus.BAD_REQUEST,
                        message: 'Phone number already in use'
                    })
                }
            }

            await this.prismaService.user.update({
                where: {
                    id: existingUser.id
                },
                data: data
            })
            return { message: "Profile updated successfully" }
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

    async onBoarding(
        userId: string,
        categoryIds: string[],
    ) {
        try {
            const existingUser = await this.prismaService.user.findUnique({ where: { id: userId } })

            if (!existingUser) throw new RpcException({
                status: HttpStatus.BAD_REQUEST,
                message: 'User not found'
            })

            await this.prismaService.userCategory.createMany({
                data: categoryIds.map(categoryId => ({
                    userId: existingUser.id,
                    categoryId
                })),
                skipDuplicates: true
            })

            return { message: "Onboarding completed successfully" }
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
