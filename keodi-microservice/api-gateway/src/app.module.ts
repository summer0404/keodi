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
import { KafkaModule } from './providers/kafka/kafka.module';
import { RedisModule } from './providers/redis/redis.module';

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
    AuthModule,
    UserModule,
    KafkaModule,
    PlaceModule,
    FavoriteModule,
    CategoryModule,
    FriendModule,
    GroupSessionModule,
    RedisModule,
    ReviewModule,
    AttributeModule,
    SearchModule,
    NotificationRealtimeModule,
  ],
})
export class AppModule {}
