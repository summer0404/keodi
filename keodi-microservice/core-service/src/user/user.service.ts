import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from 'src/prisma/prisma.service';
import { S3Service } from 'src/s3/s3.service';

@Injectable()
export class UserService {
    private readonly ALLOWED_MIME_TYPES = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp'
    ];

    constructor(
        private readonly prismaService: PrismaService,
        private readonly s3Service: S3Service
    ) { }

    async create(
        userId: number,
        firstName?: string,
        lastName?: string,
        picture?: string
    ) {
        try {
            await this.prismaService.user.create({
                data: {
                    id: Number(userId),
                    lastName: lastName ? lastName : null,
                    firstName: firstName ? firstName : null,
                    picture: picture ? picture : null
                }
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

    private validateImageFile(mimetype: string): void {
        if (!this.ALLOWED_MIME_TYPES.includes(mimetype)) {
            throw new RpcException({
                status: HttpStatus.BAD_REQUEST,
                message: `Invalid file type. Only ${this.ALLOWED_MIME_TYPES.join(', ')} are allowed`
            });
        }


        // const magicNumbers = {
        //     'image/jpeg': [0xFF, 0xD8, 0xFF],
        //     'image/jpg': [0xFF, 0xD8, 0xFF],
        //     'image/png': [0x89, 0x50, 0x4E, 0x47],
        //     'image/webp': [0x52, 0x49, 0x46, 0x46] 
        // };

        // const magic = magicNumbers[mimetype];
        // if (magic) {
        //     const header = Array.from(buffer.slice(0, magic.length));
        //     const isValid = magic.every((byte, index) => header[index] === byte);

        //     if (!isValid) {
        //         throw new RpcException({
        //             status: HttpStatus.BAD_REQUEST,
        //             message: 'File content does not match declared type'
        //         });
        //     }
        // }
    }

    async updatePicture(
        file: Buffer,
        userId: number,
        type?: string
    ) {
        if (type) {
            this.validateImageFile(type);
        }

        try {
            const existingUser = await this.prismaService.user.findUnique({ where: { id: Number(userId) } })

            if (!existingUser) throw new RpcException({
                status: HttpStatus.BAD_REQUEST,
                message: 'User not found'
            })

            const fileBuffer = Buffer.isBuffer(file) ? file : Buffer.from(file, 'base64');

            const imageUrl = await this.s3Service.uploadImage(fileBuffer, userId, type);

            if (!existingUser.picture || existingUser.picture !== imageUrl) {
                await this.prismaService.user.update({
                    where: {
                        id: existingUser.id
                    },
                    data: {
                        picture: imageUrl
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
}
