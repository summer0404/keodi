import { Module } from '@nestjs/common';
import { ConversationModule } from '../conversation/conversation.module';
import { ImageModule } from '../image/image.module';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';

@Module({
  imports: [ConversationModule, ImageModule],
  controllers: [MessageController],
  providers: [MessageService],
})
export class MessageModule {}
