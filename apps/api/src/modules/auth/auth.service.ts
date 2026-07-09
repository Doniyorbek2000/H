import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LoginDto, RegisterDto, TelegramLinkDto } from './dto/auth.dto';

const REFRESH_DAYS = 7;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly audit: AuditService,
  ) {}

  private sha256(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private async signTokens(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      departmentId: user.departmentId,
      fullName: user.fullName,
    };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
    });
    const refreshToken = randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 3600 * 1000);
    await this.prisma.refreshToken.create({
      data: { userId: user.id, tokenHash: this.sha256(refreshToken), expiresAt },
    });
    return { accessToken, refreshToken };
  }

  private sanitize(user: User) {
    const { passwordHash: _ph, ...rest } = user;
    return rest;
  }

  async validateUser(identifier: string, password: string): Promise<User> {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: identifier.toLowerCase() }, { phone: identifier }] },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Login yoki parol noto‘g‘ri');
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Login yoki parol noto‘g‘ri');
    return user;
  }

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const user = await this.validateUser(dto.identifier, dto.password);
    const tokens = await this.signTokens(user);
    await this.audit.log({
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      ip,
      userAgent,
    });
    return { user: this.sanitize(user), ...tokens };
  }

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email.toLowerCase() }, ...(dto.phone ? [{ phone: dto.phone }] : [])] },
    });
    if (exists) throw new BadRequestException('Bu email yoki telefon allaqachon ro‘yxatdan o‘tgan');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        passwordHash,
        role: Role.CITIZEN,
      },
    });
    const tokens = await this.signTokens(user);
    return { user: this.sanitize(user), ...tokens };
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.sha256(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token yaroqsiz');
    }
    // Rotation: eski tokenni bekor qilamiz
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user || !user.isActive) throw new UnauthorizedException('Foydalanuvchi faol emas');
    const tokens = await this.signTokens(user);
    return { user: this.sanitize(user), ...tokens };
  }

  async logout(refreshToken?: string, userId?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash: this.sha256(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } else if (userId) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { success: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true, department: true },
    });
    if (!user) throw new UnauthorizedException();
    return this.sanitize(user as User);
  }

  /** Telegram bot orqali xodim akkauntini chatId bilan bog'lash */
  async telegramLink(dto: TelegramLinkDto) {
    const user = await this.validateUser(dto.identifier, dto.password);
    await this.prisma.user.updateMany({
      where: { telegramChatId: dto.chatId, id: { not: user.id } },
      data: { telegramChatId: null },
    });
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { telegramChatId: dto.chatId },
    });
    return { success: true, user: this.sanitize(updated) };
  }
}
