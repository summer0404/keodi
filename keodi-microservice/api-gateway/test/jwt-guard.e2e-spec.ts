import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, signTestToken, TEST_JWT_SECRET } from './helpers/app.factory';
import * as jwt from 'jsonwebtoken';

describe('JwtAuthGuard (e2e)', () => {
  let app: INestApplication;
  let mockKafkaService: any;
  let mockRedisService: any;

  const TEST_USER_PAYLOAD = {
    sub: 'user-1',
    email: 'test@test.com',
    role: 'USER',
    username: 'testuser',
  };

  beforeAll(async () => {
    ({ app, mockKafkaService, mockRedisService } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisService.has.mockResolvedValue(false);
  });

  it('1. should return 401 with "Token not provided" when no Authorization header', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .expect(401);

    expect(res.body).toMatchObject({
      status: 401,
      message: 'Token not provided',
    });
  });

  it('2. should return 401 with "Invalid token" when JWT signed with wrong secret', async () => {
    const invalidToken = jwt.sign(TEST_USER_PAYLOAD, 'wrong-secret');

    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${invalidToken}`)
      .expect(401);

    expect(res.body).toMatchObject({
      status: 401,
      message: 'Invalid token',
    });
  });

  it('3. should return 401 with "Token has expired" when JWT is expired', async () => {
    const expiredToken = signTestToken(TEST_USER_PAYLOAD, { expiresIn: '-1s' });

    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);

    expect(res.body).toMatchObject({
      status: 401,
      message: 'Token has expired',
    });
  });

  it('4. should return 200 with valid JWT', async () => {
    const validToken = signTestToken(TEST_USER_PAYLOAD);

    mockKafkaService.sendWithTimeout.mockResolvedValue({
      id: 'user-1',
      email: 'test@test.com',
      username: 'testuser',
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${validToken}`);

    expect([200, 201]).toContain(res.status);
  });

  it('5. should return 401 with "Token has been revoked" when token is blacklisted', async () => {
    const validToken = signTestToken(TEST_USER_PAYLOAD);
    mockRedisService.has.mockResolvedValue(true);

    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(401);

    expect(res.body).toMatchObject({
      status: 401,
      message: 'Token has been revoked',
    });
  });

  it('6. should return 401 when Bearer prefix is missing', async () => {
    const validToken = signTestToken(TEST_USER_PAYLOAD);

    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', validToken)
      .expect(401);

    expect(res.body).toMatchObject({
      status: 401,
      message: 'Token not provided',
    });
  });
});
