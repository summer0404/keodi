import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import * as cookieParser from 'cookie-parser';
import * as jwt from 'jsonwebtoken';

import { ConvertToHttpExceptionFilter } from 'src/common/filters/rpc-to-http-exception.filter';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { JwtStrategy } from 'src/common/strategies/jwt.strategy';
import { AuthController } from 'src/modules/auth/auth.controller';
import { AuthService } from 'src/modules/auth/auth.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { RedisService } from 'src/providers/redis/redis.service';
import { GoogleService } from 'src/providers/google/google.service';

export const TEST_JWT_SECRET = 'test-jwt-secret';

export function signTestToken(payload: object, options?: jwt.SignOptions): string {
  return jwt.sign(payload, TEST_JWT_SECRET, options);
}

export async function createTestApp(): Promise<{
  app: INestApplication;
  mockKafkaService: { sendWithTimeout: jest.Mock; getClient: jest.Mock };
  mockRedisService: { has: jest.Mock; get: jest.Mock; set: jest.Mock; setEx: jest.Mock; del: jest.Mock };
}> {
  const mockKafkaService = {
    sendWithTimeout: jest.fn(),
    getClient: jest.fn(),
    onModuleInit: jest.fn(),
  };

  const mockRedisService = {
    has: jest.fn().mockResolvedValue(false),
    get: jest.fn(),
    set: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
  };

  const mockGoogleService = {
    verifyIdToken: jest.fn(),
  };

  const mockGoogleStrategy = {
    name: 'google',
    authenticate: jest.fn(),
  };

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        load: [
          () => ({
            JWT_SECRET: TEST_JWT_SECRET,
            GOOGLE_CLIENT_ID: 'test-google-client-id',
            GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
            GOOGLE_CALLBACK_URL: 'http://localhost:3000/auth/google/callback',
          }),
        ],
      }),
      PassportModule.register({ defaultStrategy: 'jwt' }),
    ],
    controllers: [AuthController],
    providers: [
      AuthService,
      JwtStrategy,
      { provide: KafkaService, useValue: mockKafkaService },
      { provide: RedisService, useValue: mockRedisService },
      { provide: GoogleService, useValue: mockGoogleService },
      { provide: 'GoogleStrategy', useValue: mockGoogleStrategy },
      {
        provide: APP_FILTER,
        useClass: ConvertToHttpExceptionFilter,
      },
      {
        provide: APP_GUARD,
        useClass: JwtAuthGuard,
      },
    ],
  }).compile();

  const app = moduleFixture.createNestApplication();

  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  await app.init();

  return { app, mockKafkaService, mockRedisService };
}
