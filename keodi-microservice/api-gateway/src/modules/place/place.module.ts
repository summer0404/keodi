import { Module } from '@nestjs/common';
import { PlaceController } from './place.controller';
import { PlaceService } from './place.service';
import { ReviewModule } from '../review/review.module';

@Module({
  imports: [ReviewModule],
  controllers: [PlaceController],
  providers: [PlaceService],
})
export class PlaceModule {}
