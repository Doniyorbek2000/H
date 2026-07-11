import { BadRequestException } from '@nestjs/common';
import { OtpService } from './otp.service';

/** OTP xizmati mantig'i (DEV rejim, provayder yo'q) */
describe('OtpService', () => {
  const savedEnv = { ...process.env };
  let store: any[];
  let prisma: any;
  let svc: OtpService;

  beforeEach(() => {
    delete process.env.ESKIZ_EMAIL;
    delete process.env.SMTP_HOST;
    store = [];
    prisma = {
      otpCode: {
        count: jest.fn(async ({ where }: any) => store.filter((o) => o.target === where.target).length),
        create: jest.fn(async ({ data }: any) => {
          const row = { id: `otp-${store.length}`, consumed: false, attempts: 0, ...data };
          store.push(row);
          return row;
        }),
        findFirst: jest.fn(async ({ where }: any) =>
          store
            .filter(
              (o) =>
                o.target === where.target &&
                o.purpose === where.purpose &&
                !o.consumed &&
                o.expiresAt > new Date(),
            )
            .slice(-1)[0] ?? null,
        ),
        update: jest.fn(async ({ where, data }: any) => {
          const row = store.find((o) => o.id === where.id);
          if (data.consumed !== undefined) row.consumed = data.consumed;
          if (data.attempts?.increment) row.attempts += data.attempts.increment;
          return row;
        }),
        deleteMany: jest.fn(),
      },
    };
    svc = new OtpService(prisma);
  });

  afterAll(() => {
    process.env = savedEnv;
  });

  it('DEV rejimda kod qaytaradi', async () => {
    const { devCode } = await svc.issue('+998901112233', 'PHONE_VERIFY');
    expect(devCode).toMatch(/^\d{6}$/);
  });

  it('to‘g‘ri kod tasdiqlanadi va qayta ishlatilmaydi', async () => {
    const { devCode } = await svc.issue('a@t.uz', 'PASSWORD_RESET');
    expect(await svc.verify('a@t.uz', 'PASSWORD_RESET', devCode!)).toBe(true);
    // consumed bo'lgach qayta tekshiruv false
    expect(await svc.verify('a@t.uz', 'PASSWORD_RESET', devCode!)).toBe(false);
  });

  it('noto‘g‘ri kod rad etiladi', async () => {
    await svc.issue('b@t.uz', 'PASSWORD_RESET');
    expect(await svc.verify('b@t.uz', 'PASSWORD_RESET', '000000')).toBe(false);
  });

  it('daqiqada 3 tadan ko‘p so‘rov bloklanadi', async () => {
    await svc.issue('c@t.uz', 'PHONE_VERIFY');
    await svc.issue('c@t.uz', 'PHONE_VERIFY');
    await svc.issue('c@t.uz', 'PHONE_VERIFY');
    await expect(svc.issue('c@t.uz', 'PHONE_VERIFY')).rejects.toBeInstanceOf(BadRequestException);
  });
});
