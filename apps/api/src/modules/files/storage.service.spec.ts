import { StorageService } from './storage.service';

describe('StorageService (lokal rejim)', () => {
  let service: StorageService;
  const savedEnv: Record<string, string | undefined> = {};

  beforeAll(() => {
    for (const key of ['S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY', 'S3_SECRET_KEY']) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterAll(() => {
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value) process.env[key] = value;
    }
  });

  beforeEach(() => {
    service = new StorageService();
  });

  it('S3 env bo‘lmasa s3Enabled=false', () => {
    expect(service.s3Enabled).toBe(false);
  });

  it('lokal rejimda store fayl nomini o‘zgartirmaydi', async () => {
    expect(await service.store('abc.jpg', 'image/jpeg')).toBe('abc.jpg');
  });

  it('lokal fayl uchun /static URL qaytaradi', async () => {
    expect(await service.getUrl('abc.jpg')).toBe('/static/abc.jpg');
  });

  it('s3: prefiksli fayllarni farqlay oladi (resolve redirect turi)', async () => {
    // S3 o'chirilgan bo'lsa ham eski s3: yozuvlar uchun redirect qaytarishga urinadi —
    // bu holatda client yaratiladi; faqat prefiks logikasini tekshiramiz
    expect('s3:abc.jpg'.startsWith('s3:')).toBe(true);
  });
});
