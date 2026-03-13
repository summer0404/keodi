import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { GoogleStrategy } from '../../common/strategies/google.strategy';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../../common/strategies/jwt.strategy';
import { RedisModule } from 'src/providers/redis/redis.module';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    PassportModule,
    RedisModule,
    CacheModule.register({
      isGlobal: true,
      ttl: 120000,
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleStrategy,
    JwtStrategy,
  ],
})
export class AuthModule { }
