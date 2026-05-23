import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ImageTopics } from 'src/shared/constants/topic.constant';
import { ImageService } from './image.service';

@Controller()
export class ImageController {
  constructor(private readonly imageService: ImageService) {}

  @MessagePattern(ImageTopics.GetUploadUrl)
  async getUploadUrl(@Payload() payload: { folder: string; mimeType?: string; userId?: string }) {
    return this.imageService.generateUploadUrl(payload.folder, payload.mimeType, payload.userId);
  }
}
