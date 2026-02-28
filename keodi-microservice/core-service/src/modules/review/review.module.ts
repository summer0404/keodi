import { Module } from '@nestjs/common';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { KafkaModule } from 'src/providers/kafka/kafka.module';
import { PlaceModule } from '../place/place.module';

@Module({
  imports: [
    KafkaModule,
    PlaceModule
  ],
  controllers: [ReviewController],
  providers: [ReviewService],
})
export class ReviewModule {}
