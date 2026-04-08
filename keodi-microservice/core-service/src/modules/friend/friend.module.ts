import { Module } from '@nestjs/common';
import { ImageModule } from '../image/image.module';
import { FriendController } from './friend.controller';
import { FriendService } from './friend.service';

@Module({
  imports: [ImageModule],
  controllers: [FriendController],
  providers: [FriendService],
})
export class FriendModule {}
