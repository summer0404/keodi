import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConvertToHttpExceptionFilter } from './filters/rpc-to-http-exception.filter';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { KafkaModule } from './shared/kafka.module';
import { JwtAuthGuard } from './auth/jwt.guard';
import { PlaceModule } from './place/place.module';
import { RedisModule } from './redis/redis.module';

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
    RedisModule
  ],
})
export class AppModule { }
