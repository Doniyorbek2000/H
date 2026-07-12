import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './e2e-app';

/**
 * Murojaat hayotiy sikli va xodim ruxsatlari e2e testlari.
 * Seed'dagi operator akkaunti (operator@example.com / Admin123!) va Chust
 * tashkiloti mavjud bo'lishini talab qiladi (CI'da seed bosqichi bajaradi).
 */
describe('Appeal lifecycle + staff (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  let operatorToken = '';
  let appealNumber = '';
  let appealId = '';

  beforeAll(async () => {
    app = await createTestApp();
    http = request(app.getHttpServer());

    const login = await http
      .post('/auth/login')
      .send({ identifier: 'operator@example.com', password: 'Admin123!' });
    expect(login.status).toBe(201);
    operatorToken = login.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('public murojaat yaratiladi (autentifikatsiyasiz) -> raqam qaytadi', async () => {
    const res = await http.post('/appeals/public').send({
      title: 'E2E lifecycle murojaat',
      description: 'Public kanal orqali yuborilgan test murojaati (lifecycle e2e).',
      citizenName: 'Test Fuqaro',
      citizenPhone: '+998901112233',
    });
    expect(res.status).toBe(201);
    appealNumber = res.body.appealNumber;
    appealId = res.body.id;
    expect(appealNumber).toBeTruthy();
    expect(res.body.status).toBe('NEW');
  });

  it('murojaat raqam bo‘yicha kuzatiladi -> 200, telefon yashirin', async () => {
    const res = await http.get(`/appeals/track/${appealNumber}`);
    expect(res.status).toBe(200);
    expect(res.body.appealNumber).toBe(appealNumber);
    // AI navbati statusni asinxron ravishda ilgarilatishi mumkin (NEW -> OPERATOR_REVIEW)
    expect(['NEW', 'AI_ANALYZING', 'OPERATOR_REVIEW']).toContain(res.body.status);
    expect(res.body.citizenPhone).toBeUndefined(); // telefon tashqariga chiqmaydi
  });

  it('operator murojaatlar ro‘yxatini oladi -> 200 + data massivi', async () => {
    const res = await http
      .get('/appeals')
      .set('Authorization', `Bearer ${operatorToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(0);
  });

  it('operator murojaatni ochib ko‘ra oladi (o‘z tashkiloti) -> 200', async () => {
    const res = await http
      .get(`/appeals/${appealId}`)
      .set('Authorization', `Bearer ${operatorToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(appealId);
  });

  it('operator murojaatni REJECTED holatiga o‘tkazadi', async () => {
    // REJECTED barcha boshlang'ich holatlardan (NEW/AI_ANALYZING/OPERATOR_REVIEW)
    // ruxsat etilgan — AI navbati poygasiga bardoshli deterministik o'tish.
    const res = await http
      .post(`/appeals/${appealId}/status`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ status: 'REJECTED', comment: 'Test doirasida rad etildi' });
    expect(res.status).toBe(201);

    const check = await http
      .get(`/appeals/${appealId}`)
      .set('Authorization', `Bearer ${operatorToken}`);
    expect(check.body.status).toBe('REJECTED');
  });

  it('yaroqsiz status o‘tishi rad etiladi -> 400', async () => {
    const res = await http
      .post(`/appeals/${appealId}/status`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ status: 'ASSIGNED' }); // REJECTED -> ASSIGNED mumkin emas (faqat REOPENED/CLOSED)
    expect(res.status).toBe(400);
  });
});
