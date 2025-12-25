import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { OtpService } from './otp.service';
import { RedisService } from './redis.service';
import { VerifyUrlService } from './verifyUrl.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET
    }),
    PrismaModule,
    ClientsModule.register([
      {
        name: 'NOTIFICATION_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'auth-client',
            brokers: [process.env.KAFKA_BROKER as string].filter((broker): broker is string => typeof broker === 'string')
          },
          consumer: {
            groupId: 'auth-consumer'
          }
        }
      }
    ])
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpService,
    RedisService,
    VerifyUrlService
  ],
})
export class AuthModule { }
