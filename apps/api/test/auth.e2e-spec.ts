import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, uniqueEmail, uniquePhone } from './e2e-app';

/**
 * Auth oqimi (register -> login -> me -> refresh rotation) e2e testlari.
 * Haqiqiy HTTP + haqiqiy Postgres orqali ishlaydi.
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  const email = uniqueEmail('auth');
  const phone = uniquePhone();
  const password = 'Parol123!';
  let refreshToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health -> 200', async () => {
    const res = await http.get('/health');
    expect(res.status).toBe(200);
  });

  it('POST /auth/register yangi fuqaro yaratadi va token qaytaradi', async () => {
    const res = await http.post('/auth/register').send({
      fullName: 'E2E Test Fuqaro',
      email,
      phone,
      password,
    });
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.role).toBe('CITIZEN');
    expect(res.body.user.passwordHash).toBeUndefined(); // parol hash tashqariga chiqmaydi
  });

  it('bir xil email bilan qayta register -> 400', async () => {
    const res = await http.post('/auth/register').send({
      fullName: 'Takror',
      email,
      password,
    });
    expect(res.status).toBe(400);
  });

  it('qisqa parol (< 6) bilan register -> 400', async () => {
    const res = await http.post('/auth/register').send({
      fullName: 'Qisqa parol',
      email: uniqueEmail('short'),
      password: '123',
    });
    expect(res.status).toBe(400);
  });

  it('POST /auth/login to‘g‘ri parol bilan -> 200 + token', async () => {
    const res = await http.post('/auth/login').send({ identifier: email, password });
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
    refreshToken = res.body.refreshToken;
  });

  it('POST /auth/login noto‘g‘ri parol bilan -> 401', async () => {
    const res = await http.post('/auth/login').send({ identifier: email, password: 'wrong-pass' });
    expect(res.status).toBe(401);
  });

  it('GET /auth/me tokensiz -> 401', async () => {
    const res = await http.get('/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /auth/me token bilan -> 200 + joriy foydalanuvchi', async () => {
    const login = await http.post('/auth/login').send({ identifier: email, password });
    const token = login.body.accessToken;
    const res = await http.get('/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(email);
  });

  it('POST /auth/refresh tokenni almashtiradi (rotation)', async () => {
    const res = await http.post('/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.refreshToken).not.toBe(refreshToken);

    // Eski (aylantirilgan) refresh token qayta ishlatilmaydi -> 401
    const reuse = await http.post('/auth/refresh').send({ refreshToken });
    expect(reuse.status).toBe(401);
  });
});
