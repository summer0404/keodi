import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConvertToHttpExceptionFilter } from './common/filters/rpc-to-http-exception.filter';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './modules/user/user.module';
import { KafkaModule } from './providers/kafka/kafka.module';
import { JwtAuthGuard } from './modules/auth/jwt.guard';
import { PlaceModule } from './modules/place/place.module';
import { RedisModule } from './providers/redis/redis.module';
import { CategoryModule } from './modules/category/category.module';
import { FavoriteModule } from './modules/favorite/favorite.module';

@Module({
  controllers: [
    AppController
  ],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: ConvertToHttpExceptionFilter
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard
    }
  ],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UserModule,
    KafkaModule,
    PlaceModule,
    FavoriteModule,
    CategoryModule,
    RedisModule,
  ],
})
export class AppModule { }
