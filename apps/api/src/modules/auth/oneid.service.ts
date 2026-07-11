import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Role, User } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * OneID (id.egov.uz) — O'zbekiston yagona identifikatsiya tizimi orqali kirish.
 * OAuth2 authorization code flow.
 * ONEID_CLIENT_ID + ONEID_CLIENT_SECRET + ONEID_REDIRECT_URI berilsa yoqiladi.
 */
@Injectable()
export class OneIdService {
  private readonly logger = new Logger(OneIdService.name);
  private readonly base = process.env.ONEID_BASE_URL || 'https://sso.egov.uz/sso/oauth/Authorization.do';

  get enabled(): boolean {
    return Boolean(
      process.env.ONEID_CLIENT_ID &&
        process.env.ONEID_CLIENT_SECRET &&
        process.env.ONEID_REDIRECT_URI,
    );
  }

  /** Foydalanuvchini OneID sahifasiga yo'naltirish uchun URL + state */
  buildAuthUrl(): { url: string; state: string } {
    if (!this.enabled) throw new BadRequestException('OneID sozlanmagan');
    const state = randomBytes(16).toString('hex');
    const params = new URLSearchParams({
      response_type: 'one_code',
      client_id: process.env.ONEID_CLIENT_ID!,
      redirect_uri: process.env.ONEID_REDIRECT_URI!,
      scope: process.env.ONEID_SCOPE || 'myportal',
      state,
    });
    return { url: `${this.base}?${params}`, state };
  }

  /** Authorization code -> access token */
  private async exchangeCode(code: string): Promise<string | null> {
    try {
      const body = new URLSearchParams({
        grant_type: 'one_authorization_code',
        client_id: process.env.ONEID_CLIENT_ID!,
        client_secret: process.env.ONEID_CLIENT_SECRET!,
        redirect_uri: process.env.ONEID_REDIRECT_URI!,
        code,
      });
      const res = await fetch(this.base, { method: 'POST', body });
      if (!res.ok) {
        this.logger.warn(`OneID token xatosi: ${res.status}`);
        return null;
      }
      const data: any = await res.json();
      return data.access_token ?? null;
    } catch (e) {
      this.logger.warn(`OneID token almashish xatosi: ${(e as Error).message}`);
      return null;
    }
  }

  /** Access token -> foydalanuvchi ma'lumotlari (JShShIR, F.I.Sh, ...) */
  private async fetchUserInfo(accessToken: string): Promise<any | null> {
    try {
      const body = new URLSearchParams({
        grant_type: 'one_access_token_identify',
        client_id: process.env.ONEID_CLIENT_ID!,
        client_secret: process.env.ONEID_CLIENT_SECRET!,
        access_token: accessToken,
        scope: process.env.ONEID_SCOPE || 'myportal',
      });
      const res = await fetch(this.base, { method: 'POST', body });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      this.logger.warn(`OneID user info xatosi: ${(e as Error).message}`);
      return null;
    }
  }

  constructor(private readonly prisma: PrismaService) {}

  /**
   * OneID callback: code -> user info -> tizim foydalanuvchisini topish/yaratish.
   * JShShIR (pin) yoki email bo'yicha bog'lanadi; yangi fuqaro yaratiladi.
   */
  async handleCallback(code: string): Promise<User> {
    const accessToken = await this.exchangeCode(code);
    if (!accessToken) throw new BadRequestException('OneID kodini almashtirib bo‘lmadi');
    const info = await this.fetchUserInfo(accessToken);
    if (!info || !info.pin) throw new BadRequestException('OneID ma’lumotlari olinmadi');

    const pin = String(info.pin); // JShShIR
    const fullName = [info.sur_name, info.first_name, info.mid_name].filter(Boolean).join(' ').trim() || 'Fuqaro';
    const email = info.email ? String(info.email).toLowerCase() : null;
    const phone = info.mob_phone_no ? `+${String(info.mob_phone_no).replace(/\D/g, '')}` : null;

    // JShShIR bo'yicha mavjud fuqaro (citizenJshshir sifatida saqlanmagan — email/phone orqali)
    let user =
      (email && (await this.prisma.user.findUnique({ where: { email } }))) ||
      (phone && (await this.prisma.user.findFirst({ where: { phone } }))) ||
      (await this.prisma.user.findFirst({ where: { email: `oneid_${pin}@oneid.local` } }));

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          fullName,
          email: email ?? `oneid_${pin}@oneid.local`,
          phone: phone ?? undefined,
          passwordHash: randomBytes(32).toString('hex'), // parolsiz — faqat OneID orqali
          role: Role.CITIZEN,
        },
      });
      this.logger.log(`OneID orqali yangi fuqaro: ${fullName} (JShShIR ...${pin.slice(-4)})`);
    }
    return user;
  }
}
