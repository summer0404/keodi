import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationModule } from './modules/notification/notification.module';
import { ProviderModule } from './providers/provider.module';
import { PrismaModule } from './database/prisma.module';
import { NotificationInboxModule } from './modules/notification-inbox/notification-inbox.module';
import { DeviceTokenModule } from './modules/device-token/device-token.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ProviderModule,
    NotificationModule,
    NotificationInboxModule,
    DeviceTokenModule,
    PrismaModule,
  ],
})
export class AppModule {}
