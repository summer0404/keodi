import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { OtpService } from './otp.service';
import { VerifyUrlService } from './verifyUrl.service';
import { RedisModule } from 'src/redis/redis.module';

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
            groupId: 'notification-consumer'
          }
        }
      },
      {
        name: 'CORE_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'auth-client',
            brokers: [process.env.KAFKA_BROKER as string].filter((broker): broker is string => typeof broker === 'string')
          },
          consumer: {
            groupId: 'core-consumer'
          }
        }
      }
    ]),
    RedisModule
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpService,
    VerifyUrlService
  ],
})
export class AuthModule { }
