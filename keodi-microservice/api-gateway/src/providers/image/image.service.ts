import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { SystemErrorMessage } from 'src/shared/constants/error.constant';
import { ImageTopics } from 'src/shared/constants/topic.constant';

@Injectable()
export class ImageService {
  constructor(private readonly kafkaService: KafkaService) {}

  async uploadAndGetKey(folder: string, buffer: Buffer, mimeType?: string): Promise<string> {
    const { uploadUrl, s3Key } = await this.kafkaService.sendWithTimeout(
      ImageTopics.GetUploadUrl,
      { folder, mimeType },
    );

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: new Uint8Array(buffer),
      headers: { 'Content-Type': mimeType ?? 'application/octet-stream' },
    });

    if (!response.ok) {
      throw new InternalServerErrorException(SystemErrorMessage.IMAGE_UPLOAD_FAILED);
    }

    return s3Key;
  }
}
