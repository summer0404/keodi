import { Module } from '@nestjs/common';
import { KafkaModule } from 'src/providers/kafka/kafka.module';
import { RedisModule } from 'src/providers/redis/redis.module';
import { FriendController } from './friend.controller';
import { FriendService } from './friend.service';

@Module({
  imports: [KafkaModule, RedisModule],
  controllers: [FriendController],
  providers: [FriendService],
})
export class FriendModule {}
