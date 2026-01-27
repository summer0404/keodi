import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { OtpService } from './otp.service';
import { VerifyUrlService } from './verifyUrl.service';
import { RedisModule } from 'src/providers/redis/redis.module';
import { KafkaModule } from 'src/providers/kafka/kafka.module';
import { UserModule } from 'src/modules/user/user.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
    }),
    RedisModule,
    KafkaModule,
    UserModule
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpService,
    VerifyUrlService
  ],
})
export class AuthModule { }
