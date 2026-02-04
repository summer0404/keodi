import { Module } from '@nestjs/common';
import { RedisModule } from 'src/providers/redis/redis.module';
import { PlaceController } from './place.controller';
import { PlaceService } from './place.service';

@Module({
  imports: [RedisModule],
  controllers: [PlaceController],
  providers: [PlaceService],
})
export class PlaceModule {}
