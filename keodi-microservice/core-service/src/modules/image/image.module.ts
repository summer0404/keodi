import { Module } from '@nestjs/common';
import { ImageService } from './image.service';
import { ImageController } from './image.controller';
import { S3Module } from 'src/providers/s3/s3.module';

@Module({
  controllers: [ImageController],
  providers: [ImageService],
  exports: [ImageService],
  imports: [S3Module],
})
export class ImageModule {}
