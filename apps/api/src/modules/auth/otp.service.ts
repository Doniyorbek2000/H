import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createHash, randomInt } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

export type OtpPurpose = 'REGISTER' | 'PASSWORD_RESET' | 'PHONE_VERIFY';

/**
 * OTP (bir martalik kod) xizmati — fuqaro identifikatsiyasi va parol tiklash uchun.
 * Yuborish provayderi abstraksiya qilingan:
 *  - SMS: SMS_PROVIDER=eskiz + ESKIZ_* env berilsa Eskiz.uz orqali
 *  - Email: SMTP_* env berilsa (kelajakda)
 *  - Aks holda: DEV rejimi — kod logga chiqadi va javobda qaytariladi
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private eskizToken: { value: string; expiresAt: number } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  get devMode(): boolean {
    return !process.env.ESKIZ_EMAIL && !process.env.SMTP_HOST;
  }

  private hash(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  /** Kod yaratib, yuboradi. DEV rejimda kodni qaytaradi (aks holda undefined). */
  async issue(target: string, purpose: OtpPurpose): Promise<{ devCode?: string }> {
    // Oxirgi daqiqada ko'p so'rovni cheklash
    const recent = await this.prisma.otpCode.count({
      where: { target, purpose, createdAt: { gt: new Date(Date.now() - 60000) } },
    });
    if (recent >= 3) {
      throw new BadRequestException('Juda ko‘p urinish. Bir daqiqadan so‘ng qayta urinib ko‘ring.');
    }
    const code = String(randomInt(100000, 1000000)); // 6 xonali
    await this.prisma.otpCode.create({
      data: {
        target,
        purpose,
        codeHash: this.hash(code),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 daqiqa
      },
    });

    const text = `Smart Murojaat AI tasdiqlash kodi: ${code}. 5 daqiqa amal qiladi.`;
    const sent = await this.send(target, text);
    if (!sent) {
      this.logger.warn(`OTP [DEV] ${target} (${purpose}): ${code}`);
      return { devCode: code };
    }
    return {};
  }

  /** Kodni tekshirish — to'g'ri bo'lsa consumed=true qiladi */
  async verify(target: string, purpose: OtpPurpose, code: string): Promise<boolean> {
    const otp = await this.prisma.otpCode.findFirst({
      where: { target, purpose, consumed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) return false;
    if (otp.attempts >= 5) {
      throw new BadRequestException('Kod urinishlari tugadi. Yangi kod so‘rang.');
    }
    if (otp.codeHash !== this.hash(code)) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      return false;
    }
    await this.prisma.otpCode.update({ where: { id: otp.id }, data: { consumed: true } });
    return true;
  }

  /** Haqiqiy yuborish (SMS/email). Muvaffaqiyatda true, DEV rejimda false. */
  private async send(target: string, text: string): Promise<boolean> {
    // Eskiz.uz SMS (O'zbekiston)
    if (process.env.ESKIZ_EMAIL && process.env.ESKIZ_PASSWORD && /^\+?\d{9,}$/.test(target)) {
      try {
        const token = await this.eskizAuth();
        if (!token) return false;
        const form = new URLSearchParams({
          mobile_phone: target.replace(/\D/g, ''),
          message: text,
          from: process.env.ESKIZ_FROM || '4546',
        });
        const res = await fetch('https://notify.eskiz.uz/api/message/sms/send', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });
        return res.ok;
      } catch (e) {
        this.logger.warn(`Eskiz SMS xatosi: ${(e as Error).message}`);
        return false;
      }
    }
    // Email/SMTP provayderi shu yerga qo'shiladi (SMTP_HOST bo'lsa)
    return false;
  }

  private async eskizAuth(): Promise<string | null> {
    if (this.eskizToken && this.eskizToken.expiresAt > Date.now()) return this.eskizToken.value;
    try {
      const form = new URLSearchParams({
        email: process.env.ESKIZ_EMAIL!,
        password: process.env.ESKIZ_PASSWORD!,
      });
      const res = await fetch('https://notify.eskiz.uz/api/auth/login', {
        method: 'POST',
        body: form,
      });
      if (!res.ok) return null;
      const data: any = await res.json();
      const token = data?.data?.token;
      if (!token) return null;
      this.eskizToken = { value: token, expiresAt: Date.now() + 25 * 24 * 3600 * 1000 };
      return token;
    } catch {
      return null;
    }
  }

  /** Muddati o'tgan/ishlatilgan kodlarni har soatda tozalash */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanup() {
    try {
      await this.prisma.otpCode.deleteMany({
        where: { OR: [{ expiresAt: { lt: new Date() } }, { consumed: true }] },
      });
    } catch (e) {
      this.logger.warn(`OTP cleanup xatosi: ${(e as Error).message}`);
    }
  }
}
