import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { UserImageType } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { S3Service } from 'src/providers/s3/s3.service';

@Injectable()
export class ImageService {
    constructor(
        private readonly prismaService: PrismaService,
        private readonly s3Service: S3Service
    ) { }

    private readonly ALLOWED_MIME_TYPES = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp'
    ];

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

    async updateUserProfilePicture(
        id: string,
        userId: string,
        file: Buffer,
        type?: string
    ) {
        if (type) {
            this.validateImageFile(type);
        }
        try {
            const fileBuffer = Buffer.isBuffer(file) ? file : Buffer.from(file, 'base64');

            const imageUrl = await this.s3Service.uploadImage(fileBuffer, userId, type);

            const existingPictureUrl = await this.prismaService.userImage.findFirst({
                where: {
                    userId,
                    type: UserImageType.PICTURE
                }
            })

            if (existingPictureUrl) {
                return await this.prismaService.image.update({
                    where: { id },
                    data: { url: imageUrl },
                });
            } else {
                return await this.prismaService.image.create({
                    data: {
                        url: imageUrl,
                        userImages: {
                            create: {
                                userId,
                                type: UserImageType.PICTURE
                            }
                        }
                    }
                });
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
}
