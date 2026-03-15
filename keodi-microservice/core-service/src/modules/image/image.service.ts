import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { UserImageType } from '@prisma/client';
import { ImageConstants } from 'src/shared/constants/image.constant';
import { handleServiceErrorCatching } from 'src/shared/helpers/error.helper';
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
