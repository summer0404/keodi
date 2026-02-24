import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { UserImageType } from '@prisma/client';
import { ImageConstants } from 'src/common/constants/image.constant';
import { handleServiceErrorCatching } from 'src/common/helpers/error.helper';
import { PrismaService } from 'src/database/prisma.service';
import { S3Service } from 'src/providers/s3/s3.service';

@Injectable()
export class ImageService {
    constructor(
        private readonly prismaService: PrismaService,
        private readonly s3Service: S3Service
    ) { }

    private validateImageFile(mimetype: string): void {
        if (!ImageConstants.ALLOWED_MIME_TYPES.includes(mimetype)) {
            throw new RpcException({
                status: HttpStatus.BAD_REQUEST,
                message: `Invalid file type. Only ${ImageConstants.ALLOWED_MIME_TYPES.join(', ')} are allowed`
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

    async getImageViewUrl(key: string): Promise<string> {
        try {
            if (key.startsWith('http://') || key.startsWith('https://')) {
                return key;
            }

            return await this.s3Service.generateImageViewPresignedUrl(key);
        } catch (error) {
            return handleServiceErrorCatching(error)
        }
    }

    async updateUserProfilePicture(
        userId: string,
        file: Buffer,
        type?: string
    ) {
        if (type) {
            this.validateImageFile(type);
        }
        try {
            const key = `${ImageConstants.IMAGE_FOLDERS.USER_IMAGES}/user_${userId}_picture.jpg`;

            const fileBuffer = Buffer.isBuffer(file) ? file : Buffer.from(file, 'base64');

            await this.s3Service.uploadImage(fileBuffer, key, type);

            const existingPictureUrl = await this.prismaService.userImage.findFirst({
                where: {
                    userId,
                    type: UserImageType.PICTURE
                }
            })

            if (existingPictureUrl) {
                return await this.prismaService.image.update({
                    where: { id: existingPictureUrl.imageId },
                    data: { url: key },
                });
            } else {
                return await this.prismaService.image.create({
                    data: {
                        url: key,
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
            return handleServiceErrorCatching(error)
        }
    }
}
