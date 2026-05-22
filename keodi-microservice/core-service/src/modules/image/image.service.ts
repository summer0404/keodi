import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { randomUUID } from 'crypto';
import { PrismaService } from 'src/database/prisma.service';
import { S3Service } from 'src/providers/s3/s3.service';
import { ImageErrorMessages } from 'src/shared/constants/error.constant';
import { ImageConstants } from 'src/shared/constants/image.constant';

@Injectable()
export class ImageService {
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

  async generateUploadUrl(folder: string, mimeType?: string): Promise<{ uploadUrl: string; key: string }> {
    if (mimeType) {
      this.validateImageFile(mimeType);
    }
    const key = `${folder}/${randomUUID()}`;
    const uploadUrl = await this.s3Service.generateImageUploadPresignedUrl(key, mimeType);
    return { uploadUrl, key };
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
