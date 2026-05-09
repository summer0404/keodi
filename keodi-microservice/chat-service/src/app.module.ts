import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './database/prisma.module';
import { ConversationModule } from './modules/conversation/conversation.module';
import { MemberModule } from './modules/member/member.module';
import { MessageModule } from './modules/message/message.module';
import { ProviderModule } from './providers/provider.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ProviderModule,
    PrismaModule,
    ConversationModule,
    MessageModule,
    MemberModule,
  ],
})
export class AppModule {}
