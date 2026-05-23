import {
  GetObjectCommand,
  GetObjectCommandInput,
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ImageConstants } from 'src/shared/constants/image.constant';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor() {
    const region = process.env.S3_REGION;
    const accessKeyId = process.env.S3_ACCESS_KEY;
    const secretAccessKey = process.env.S3_SECRET_KEY;
    const bucket = process.env.S3_BUCKET;

    if (!region || !accessKeyId || !secretAccessKey || !bucket) {
      throw new Error('Missing S3 configuration in environment variables');
    }

    this.bucket = bucket;
    this.region = region;

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  async generateImageViewPresignedUrl(key: string): Promise<string> {
    if (
      ImageConstants.PUBLIC_IMAGE_FOLDERS.some((folder) =>
        key.startsWith(folder),
      )
    ) {
      return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
    }

    const params: GetObjectCommandInput = {
      Bucket: this.bucket,
      Key: key,
    };
    const command = new GetObjectCommand(params);
    return await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
  }

  async generateImageUploadPresignedUrl(key: string, contentType?: string): Promise<string> {
    const params: PutObjectCommandInput = {
      Bucket: this.bucket,
      Key: key,
      ...(contentType ? { ContentType: contentType } : {}),
    };
    const command = new PutObjectCommand(params);
    return await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
  }

}
