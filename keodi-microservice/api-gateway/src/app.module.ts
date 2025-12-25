import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { APP_FILTER } from '@nestjs/core';
import { ConvertToHttpExceptionFilter } from './filters/rpc-to-http-exception.filter';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { KafkaModule } from './shared/kafka.module';

@Module({
  controllers: [
    AppController
  ],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: ConvertToHttpExceptionFilter
    }
  ],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UserModule,
    KafkaModule
  ],
})
export class AppModule { }
