import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConvertToHttpExceptionFilter } from './common/filters/rpc-to-http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt.guard';
import { AttributeModule } from './modules/attribute/attribute.module';
import { AuthModule } from './modules/auth/auth.module';
import { CategoryModule } from './modules/category/category.module';
import { FavoriteModule } from './modules/favorite/favorite.module';
import { FriendModule } from './modules/friend/friend.module';
import { GroupSessionModule } from './modules/group-session/group-session.module';
import { NotificationRealtimeModule } from './modules/notification-realtime/notification-realtime.module';
import { PlaceModule } from './modules/place/place.module';
import { ReviewModule } from './modules/review/review.module';
import { SearchModule } from './modules/search/search.module';
import { UserModule } from './modules/user/user.module';
import { ProviderModule } from './providers/provider.module';
import { CacheModule } from '@nestjs/cache-manager';
import { SettingModule } from './modules/setting/setting.module';
import { OwnerApplicationModule } from './modules/owner-application/owner-application.module';
import { DeviceTokenModule } from './modules/device-token/device-token.module';

@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: ConvertToHttpExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.register({
      isGlobal: true,
      ttl: 120000,
    }),
    AuthModule,
    UserModule,
    PlaceModule,
    FavoriteModule,
    CategoryModule,
    FriendModule,
    GroupSessionModule,
    ReviewModule,
    AttributeModule,
    SearchModule,
    NotificationRealtimeModule,
    ProviderModule,
    SettingModule,
    OwnerApplicationModule,
    DeviceTokenModule,
  ],
})
export class AppModule {}
