import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, signTestToken } from './helpers/app.factory';

describe('Auth endpoints (e2e)', () => {
  let app: INestApplication;
  let mockKafkaService: any;
  let mockRedisService: any;

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

  // ─── POST /api/v1/auth/register ───────────────────────────────────────────

  describe('POST /api/v1/auth/register (SkipAuth)', () => {
    it('should return 400 when body is empty', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({})
        .expect(400);

      expect(res.body).toHaveProperty('status', 400);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 201/200 with valid registration body', async () => {
      const mockResponse = { message: 'User created successfully', userId: 'user-uuid-1' };
      mockKafkaService.sendWithTimeout.mockResolvedValue(mockResponse);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          username: 'testuser1',
          email: 'test@test.com',
          password: 'Password1@',
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body).toMatchObject(mockResponse);
    });
  });

  // ─── POST /api/v1/auth/login ──────────────────────────────────────────────

  describe('POST /api/v1/auth/login (SkipAuth)', () => {
    it('should return 400 when identifier is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ password: 'Password1@' })
        .expect(400);

      expect(res.body).toHaveProperty('status', 400);
      expect(res.body).toHaveProperty('message');
    });

    it('should return accessToken and set refreshToken cookie on valid login', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue({
        accessToken: 'mock-access',
        refreshToken: 'mock-refresh',
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ identifier: 'test@test.com', password: 'Password1@' });

      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('accessToken', 'mock-access');
      expect(res.headers['set-cookie']).toBeDefined();
      const cookies: string[] = Array.isArray(res.headers['set-cookie'])
        ? res.headers['set-cookie']
        : [res.headers['set-cookie']];
      const refreshCookie = cookies.find((c: string) => c.startsWith('refreshToken='));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toContain('mock-refresh');
    });
  });

  // ─── GET /api/v1/auth/me ──────────────────────────────────────────────────

  describe('GET /api/v1/auth/me (requires JWT)', () => {
    it('should return 401 when no authorization header is provided', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);

      expect(res.body).toHaveProperty('status', 401);
    });

    it('should return 200 with valid JWT', async () => {
      const token = signTestToken({
        sub: 'user-1',
        email: 'test@test.com',
        role: 'USER',
        username: 'testuser',
      });

      mockKafkaService.sendWithTimeout.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        username: 'testuser',
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 201]).toContain(res.status);
    });
  });

  // ─── POST /api/v1/auth/forgot-password-otp ───────────────────────────────

  describe('POST /api/v1/auth/forgot-password-otp (SkipAuth)', () => {
    it('should return 400 when email is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password-otp')
        .send({})
        .expect(400);

      expect(res.body).toHaveProperty('status', 400);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 200/201 when valid email is provided', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue({ userId: 'user-1' });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password-otp')
        .send({ email: 'test@test.com' });

      expect([200, 201]).toContain(res.status);
    });
  });

  // ─── GET /api/v1/auth/verify-email/:token ────────────────────────────────

  describe('GET /api/v1/auth/verify-email/:token (SkipAuth)', () => {
    it('should not require auth and delegate to service', async () => {
      mockKafkaService.sendWithTimeout.mockResolvedValue('<html>Email Verified</html>');

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/verify-email/some-verify-token');

      expect([200, 201]).toContain(res.status);
    });
  });

  // ─── POST /api/v1/auth/reset-password-otp ───────────────────────────────

  describe('POST /api/v1/auth/reset-password-otp (requires JWT)', () => {
    it('should return 401 when no JWT is provided', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password-otp')
        .send({ email: 'test@test.com' })
        .expect(401);

      expect(res.body).toHaveProperty('status', 401);
    });
  });
});
