import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from 'src/database/prisma.service';
import { S3Service } from 'src/providers/s3/s3.service';
import { ImageErrorMessages, INTERNAL_SERVER_ERROR } from 'src/shared/constants/error.constant';
import { ImageConstants } from 'src/shared/constants/image.constant';

@Injectable()
export class ImageService {
  private readonly logger = new Logger(ImageService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  private validateImageFile(mimetype: string): void {
    if (!ImageConstants.ALLOWED_MIME_TYPES.includes(mimetype)) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: ImageErrorMessages.invalidFileType(
          ImageConstants.ALLOWED_MIME_TYPES,
        ),
      });
    }
  }

  async generateUploadUrl(folder: string, mimeType?: string, userId?: string): Promise<{ uploadUrl: string; s3Key: string }> {
    if (mimeType) {
      this.validateImageFile(mimeType);
    }
    const s3Key = userId
      ? `${ImageConstants.IMAGE_FOLDERS.USER_IMAGES}/user_${userId}_picture.jpg`
      : `${folder}/${Date.now()}`;
    try {
      const uploadUrl = await this.s3Service.generateImageUploadPresignedUrl(s3Key, mimeType);
      return { uploadUrl, s3Key };
    } catch (error) {
      this.logger.error('Failed to generate presigned upload URL', error);
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: INTERNAL_SERVER_ERROR,
      });
    }
  }

  async persistImageRecord(key: string, imageId?: string): Promise<{ id: string; key: string }> {
    const resolvedImageId = imageId?.trim();
    const image = resolvedImageId
      ? await this.prismaService.image.update({ where: { id: resolvedImageId }, data: { url: key } })
      : await this.prismaService.image.create({ data: { url: key }, select: { id: true, url: true } });
    return { id: image.id, key: image.url };
  }

  async getImageViewUrl(key: string): Promise<string> {
    if (
      key.startsWith(ImageConstants.PREFIX_URL.HTTP) ||
      key.startsWith(ImageConstants.PREFIX_URL.HTTPS)
    ) {
      return key;
    }
    return this.s3Service.generateImageViewPresignedUrl(key);
  }
}
