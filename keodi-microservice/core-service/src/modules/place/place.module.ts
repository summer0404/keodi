import { Module } from '@nestjs/common';
import { PlaceService } from './place.service';
import { PlaceController } from './place.controller';
import { ImageModule } from '../image/image.module';

@Module({
  controllers: [PlaceController],
  providers: [PlaceService],
  exports: [PlaceService],
  imports: [ImageModule],
})
export class PlaceModule {}
