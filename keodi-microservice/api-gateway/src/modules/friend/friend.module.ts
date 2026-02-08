import { Module } from '@nestjs/common';
import { RedisModule } from 'src/providers/redis/redis.module';
import { FriendController } from './friend.controller';
import { FriendService } from './friend.service';

@Module({
  imports: [RedisModule],
  controllers: [FriendController],
  providers: [FriendService],
})
export class FriendModule {}
