import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, uniqueEmail } from './e2e-app';

/**
 * RBAC va IDOR (broken access control) e2e testlari.
 * Ikki fuqaro yaratamiz: A o'z murojaatini ko'ra oladi, B esa yo'q (403).
 */
describe('RBAC / IDOR (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  let tokenA = '';
  let tokenB = '';
  let appealIdA = '';

  const password = 'Parol123!';

  async function registerCitizen(): Promise<string> {
    const res = await http.post('/auth/register').send({
      fullName: 'IDOR Test',
      email: uniqueEmail('idor'),
      password,
    });
    expect(res.status).toBe(201);
    return res.body.accessToken as string;
  }

  beforeAll(async () => {
    app = await createTestApp();
    http = request(app.getHttpServer());
    tokenA = await registerCitizen();
    tokenB = await registerCitizen();

    const created = await http
      .post('/appeals')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        title: 'E2E IDOR murojaat',
        description: 'Bu murojaat faqat egasiga ko‘rinishi kerak, boshqa fuqaroga yo‘q.',
        citizenName: 'Fuqaro A',
        citizenPhone: '+998901234567',
      });
    expect(created.status).toBe(201);
    appealIdA = created.body.id;
    expect(appealIdA).toBeTruthy();
  });

  afterAll(async () => {
    await app.close();
  });

  it('egasi (A) o‘z murojaatini ko‘ra oladi -> 200', async () => {
    const res = await http
      .get(`/appeals/${appealIdA}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(appealIdA);
  });

  it('boshqa fuqaro (B) begona murojaatni ko‘ra olmaydi -> 403 (IDOR bloklandi)', async () => {
    const res = await http
      .get(`/appeals/${appealIdA}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(403);
  });

  it('autentifikatsiyasiz murojaatni ko‘rish -> 401', async () => {
    const res = await http.get(`/appeals/${appealIdA}`);
    expect(res.status).toBe(401);
  });

  it('fuqaro xodimga tegishli endpointga (extend-deadline) kira olmaydi -> 403 (RBAC)', async () => {
    const res = await http
      .post(`/appeals/${appealIdA}/extend-deadline`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ hours: 24, reason: 'test' });
    expect(res.status).toBe(403);
  });

  it('fuqaro tashkilot yarata olmaydi (SUPER_ADMIN only) -> 403 (RBAC)', async () => {
    const res = await http
      .post('/organizations')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Ruxsatsiz tashkilot', type: 'HOKIMLIK' });
    expect(res.status).toBe(403);
  });
});
