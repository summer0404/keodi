import { Module } from '@nestjs/common';
import { ImageModule } from '../image/image.module';
import { ConversationModule } from '../conversation/conversation.module';
import { FriendController } from './friend.controller';
import { FriendService } from './friend.service';

@Module({
  imports: [ImageModule, ConversationModule],
  controllers: [FriendController],
  providers: [FriendService],
})
export class FriendModule {}
