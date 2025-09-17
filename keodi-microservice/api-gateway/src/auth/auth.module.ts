import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { GoogleStrategy } from './google.strategy';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule,
    ClientsModule.registerAsync([
      {
        name: 'AUTH_SERVICE',
        inject: [ConfigService],
        useFactory: async (config: ConfigService) => {
          const brokersString = config.get<string>('KAFKA_BROKER');
          const brokers = brokersString ? brokersString.split(',') : [];

          return {
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: 'api-gateway-client',
                brokers,
              },
              consumer: {
                groupId: 'api-gateway-consumer',
              },
            },
          }
        }
      }
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleStrategy,
    JwtStrategy,
  ],
})
export class AuthModule { }
