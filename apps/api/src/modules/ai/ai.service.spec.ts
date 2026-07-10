import { AiService } from './ai.service';
import { AuditService } from '../audit/audit.service';

describe('AiService (fallback rejim, GEMINI_API_KEY yo‘q)', () => {
  let service: AiService;
  let originalKey: string | undefined;

  beforeAll(() => {
    originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
  });

  afterAll(() => {
    if (originalKey) process.env.GEMINI_API_KEY = originalKey;
  });

  beforeEach(() => {
    const auditStub = { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
    service = new AiService(auditStub);
  });

  const baseInput = {
    region: 'Namangan viloyati',
    district: 'Chust tumani',
    mahalla: 'Guliston mahallasi',
    categories: ['Suv', 'Elektr', 'Yo‘l', 'Bandlik', 'Boshqa'],
    departments: ['Kommunal xizmatlar', 'Qurilish bo‘limi'],
  };

  it('AI o‘chirilganda enabled=false bo‘ladi', () => {
    expect(service.enabled).toBe(false);
  });

  it('suv haqidagi murojaatni "Suv" kategoriyasiga tasniflaydi', async () => {
    const result = await service.analyzeAppeal({
      ...baseInput,
      title: 'Suv chiqmayapti',
      text: 'Mahallamizda uch kundan beri ichimlik suvi kelmayapti, quvur eskirgan.',
    });
    expect(result.engine).toBe('fallback:keywords');
    expect(result.category).toBe('Suv');
    expect(result.responseDraft.length).toBeGreaterThan(10);
  });

  it('favqulodda so‘zlar URGENT ustuvorlik beradi', async () => {
    const result = await service.analyzeAppeal({
      ...baseInput,
      title: 'Gaz quvurida avariya',
      text: 'Ko‘chamizda gaz quvurida avariya yuz berdi, portlash xavfi bor, odamlar xavotirda.',
    });
    expect(result.priority).toBe('URGENT');
    expect(result.sentiment).toBe('urgent');
  });

  it('"yaxshilash" so‘zi Bandlik kategoriyasiga noto‘g‘ri tushmaydi (\\bish\\b chegarasi)', async () => {
    const result = await service.analyzeAppeal({
      ...baseInput,
      title: 'Ko‘chalarni obodonlashtirishni yaxshilash',
      text: 'Mahallada obodonlashtirishni yaxshilash bo‘yicha takliflarim bor edi, ko‘rib chiqing.',
    });
    expect(result.category).not.toBe('Bandlik');
  });

  it('fallback muddat 0 qaytaradi (kategoriya/sozlama hal qilishi uchun)', async () => {
    const result = await service.analyzeAppeal({
      ...baseInput,
      title: 'Suv muammosi',
      text: 'Mahallada suv bosimi juda past bo‘lib qoldi, yechim kerak.',
    });
    expect(result.deadlineHours).toBe(0);
  });

  it('mahalla ko‘rsatilmasa missingInfo ga qo‘shadi', async () => {
    const result = await service.analyzeAppeal({
      ...baseInput,
      mahalla: null,
      title: 'Chiqindi olib ketilmayapti',
      text: 'Konteynerlar to‘lib ketgan, bir haftadan beri chiqindi olib ketilmadi.',
    });
    expect(result.missingInfo).toContain('mahalla nomi');
  });

  describe('similarity (duplicate detection)', () => {
    it('deyarli bir xil matnlar yuqori ball oladi', () => {
      const a = 'Guliston mahallasida suv quvuri yorilib ketdi, ko‘chani suv bosdi';
      const b = 'Guliston mahallasida suv quvuri yorildi, ko‘chani suv bosgan';
      expect(service.similarity(a, b)).toBeGreaterThanOrEqual(0.4);
    });

    it('mutlaqo boshqa matnlar past ball oladi', () => {
      const a = 'Guliston mahallasida suv quvuri yorilib ketdi';
      const b = 'Maktab sport zalini ta’mirlash kerak, pol taxtalari singan';
      expect(service.similarity(a, b)).toBeLessThan(0.2);
    });

    it('bo‘sh matn 0 qaytaradi', () => {
      expect(service.similarity('', 'nimadir')).toBe(0);
    });
  });

  describe('normalizeForDuplicate', () => {
    it('punktuatsiya va apostroflarni tozalaydi', () => {
      expect(service.normalizeForDuplicate("Yo‘l — buzilgan!!! (juda)")).toBe('yol buzilgan juda');
    });
  });

  it('generateLeaderReport fallback matn qaytaradi', async () => {
    const text = await service.generateLeaderReport(
      { total: 10, completed: 5, overdue: 2, topCategories: [{ name: 'Suv', count: 4 }] },
      'kunlik',
    );
    expect(text).toContain('10');
    expect(text).toContain('Suv');
  });
});
