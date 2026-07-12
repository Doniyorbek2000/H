import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, uniqueEmail } from './e2e-app';

/**
 * Fayl kirish nazorati va OneID bir martalik kod xavfsizligi e2e testlari.
 */
describe('Security: fayllar + OneID (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let citizenToken = '';

  beforeAll(async () => {
    app = await createTestApp();
    http = request(app.getHttpServer());
    const reg = await http.post('/auth/register').send({
      fullName: 'Fayl test',
      email: uniqueEmail('file'),
      password: 'Parol123!',
    });
    citizenToken = reg.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('autentifikatsiyasiz fayl yuklab olish -> 401 (avvalgi IDOR yopilgan)', async () => {
    const res = await http.get('/files/anything-id/raw');
    expect(res.status).toBe(401);
  });

  it('mavjud bo‘lmagan faylni (autentifikatsiya bilan) -> 404', async () => {
    const res = await http
      .get('/files/00000000-0000-0000-0000-000000000000/raw')
      .set('Authorization', `Bearer ${citizenToken}`);
    expect(res.status).toBe(404);
  });

  it('umumiy /static statik-server o‘chirilgan -> 404', async () => {
    const res = await http.get('/static/anything.jpg');
    expect(res.status).toBe(404);
  });

  it('OneID exchange yaroqsiz kod -> 401', async () => {
    const res = await http.post('/auth/oneid/exchange').send({ code: 'yaroqsiz-kod' });
    expect(res.status).toBe(401);
  });

  it('OneID exchange bo‘sh kod -> 401', async () => {
    const res = await http.post('/auth/oneid/exchange').send({});
    expect(res.status).toBe(401);
  });

  it('OneID callback noma’lum state bilan (CSRF) -> login xatosiga yo‘naltiradi', async () => {
    const res = await http.get('/auth/oneid/callback?code=x&state=soxta-state');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('oneid_error=1');
  });
});
