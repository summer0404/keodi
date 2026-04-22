import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { ImageErrorMessages } from 'src/shared/constants/error.constant';
import { ImageConstants } from 'src/shared/constants/image.constant';
import { handleServiceErrorCatching } from 'src/shared/utils/error.util';
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
                message: ImageErrorMessages.invalidFileType(ImageConstants.ALLOWED_MIME_TYPES),
            });
        }
    }

    async getImageViewUrl(key: string): Promise<string> {
        try {
            if (
                key.startsWith(ImageConstants.PREFIX_URL.HTTP) ||
                key.startsWith(ImageConstants.PREFIX_URL.HTTPS)
            ) {
                return key;
            }

            return await this.s3Service.generateImageViewPresignedUrl(key);
        } catch (error) {
            return handleServiceErrorCatching(error)
        }
    }

    async uploadImage(
        key: string,
        file: Buffer | string | { data?: number[] },
        type?: string,
        imageId?: string
    ): Promise<{ id: string; key: string }> {
        if (type) {
            this.validateImageFile(type);
        }

        try {
            const fileBuffer = Buffer.isBuffer(file)
                ? file
                : typeof file === 'string'
                    ? Buffer.from(file, 'base64')
                    : Array.isArray(file.data)
                        ? Buffer.from(file.data)
                        : Buffer.from([]);

            await this.s3Service.uploadImage(fileBuffer, key, type);

            const resolvedImageId = imageId?.trim();
            
            const image = await this.prismaService.image.upsert({
                where: { id: resolvedImageId },
                update: { url: key },
                create: { url: key },
                select: { id: true, url: true },
            });

            return {
                id: image.id,
                key: image.url,
            };
        } catch (error) {
            return handleServiceErrorCatching(error)
        }
    }
}
