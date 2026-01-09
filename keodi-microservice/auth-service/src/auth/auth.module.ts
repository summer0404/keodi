import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'src/prisma/prisma.module';
import { OtpService } from './otp.service';
import { VerifyUrlService } from './verifyUrl.service';
import { RedisModule } from 'src/redis/redis.module';
import { KafkaModule } from 'src/kafka/kafka.module';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET
    }),
    PrismaModule,
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
