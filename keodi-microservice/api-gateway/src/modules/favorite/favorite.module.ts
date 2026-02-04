import { Module } from '@nestjs/common';
import { KafkaModule } from 'src/providers/kafka/kafka.module';
import { RedisModule } from 'src/providers/redis/redis.module';
import { FavoriteController } from './favorite.controller';
import { FavoriteService } from './favorite.service';

@Module({
  imports: [KafkaModule, RedisModule],
  controllers: [FavoriteController],
  providers: [FavoriteService],
})
export class FavoriteModule {}
