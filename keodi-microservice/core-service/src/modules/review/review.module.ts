import { Module } from '@nestjs/common';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { KafkaModule } from 'src/providers/kafka/kafka.module';

@Module({
  imports: [KafkaModule],
  controllers: [ReviewController],
  providers: [ReviewService],
})
export class ReviewModule {}
