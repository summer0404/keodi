import { Module } from '@nestjs/common';
import { PlaceService } from './place.service';
import { PlaceController } from './place.controller';
import { ImageModule } from '../image/image.module';
import { PlaceHelper } from './place.helper';

@Module({
  controllers: [PlaceController],
  providers: [PlaceService, PlaceHelper],
  exports: [PlaceService],
  imports: [ImageModule],
})
export class PlaceModule {}
