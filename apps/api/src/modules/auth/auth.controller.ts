import {
  Body,
  Controller,
  Get,
  Headers,
  Ip,
  Post,
  Query,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { OneIdService } from './oneid.service';
import {
  LoginDto,
  RefreshDto,
  RegisterDto,
  RequestOtpDto,
  ResetPasswordDto,
  TelegramLinkDto,
  VerifyPhoneDto,
} from './dto/auth.dto';
import { Public } from '../../common/decorators/public.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly oneId: OneIdService,
  ) {}

  @Public()
  @Get('oneid/login')
  @ApiOperation({ summary: 'OneID (id.egov.uz) orqali kirishni boshlash' })
  oneidLogin(@Res() res: Response) {
    const { url } = this.oneId.buildAuthUrl();
    return res.redirect(url);
  }

  @Public()
  @Get('oneid/callback')
  @ApiOperation({ summary: 'OneID callback — bir martalik kod bilan web portalga qaytadi' })
  async oneidCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const webUrl = (process.env.WEB_URL || 'http://localhost:3000').split(',')[0];
    try {
      // CSRF: callback faqat biz boshlagan login oqimidan kelgan bo'lishi kerak
      if (!this.oneId.validateState(state)) {
        return res.redirect(`${webUrl}/login?oneid_error=1`);
      }
      const user = await this.oneId.handleCallback(code);
      // Tokenlarni URL query stringga qo'ymaymiz (log/history/referer sizishi).
      // O'rniga bir martalik qisqa kod beramiz — web uni POST bilan almashtiradi.
      const exchange = this.oneId.issueExchangeCode(user.id);
      return res.redirect(`${webUrl}/oneid?code=${exchange}`);
    } catch (e) {
      return res.redirect(`${webUrl}/login?oneid_error=1`);
    }
  }

  @Public()
  @Post('oneid/exchange')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'OneID bir martalik kodni sessiya tokenlariga almashtirish' })
  async oneidExchange(@Body() body: { code?: string }) {
    const userId = this.oneId.consumeExchangeCode(body?.code ?? '');
    if (!userId) throw new UnauthorizedException('Kod yaroqsiz yoki muddati o‘tgan');
    const user = await this.authService.findUserById(userId);
    if (!user) throw new UnauthorizedException('Foydalanuvchi topilmadi');
    return this.authService.issueTokensFor(user);
  }

  @Public()
  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 8 } }) // brute-force himoya: 8 urinish/daqiqa/IP
  @ApiOperation({ summary: 'Tizimga kirish (email/telefon + parol)' })
  login(@Body() dto: LoginDto, @Ip() ip: string, @Headers('user-agent') userAgent?: string) {
    return this.authService.login(dto, ip, userAgent);
  }

  @Public()
  @Post('register')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Fuqaro ro‘yxatdan o‘tishi' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Access tokenni yangilash (rotation)' })
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tizimdan chiqish' })
  logout(@CurrentUser() user: AuthUser, @Body() body: { refreshToken?: string }) {
    return this.authService.logout(body?.refreshToken, user.id);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Joriy foydalanuvchi ma’lumotlari' })
  me(@CurrentUser() user: AuthUser) {
    return this.authService.me(user.id);
  }

  @Public()
  @Post('password-reset/request')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Parol tiklash kodini so‘rash (SMS/email)' })
  requestPasswordReset(@Body() dto: RequestOtpDto) {
    return this.authService.requestPasswordReset(dto.identifier);
  }

  @Public()
  @Post('password-reset/confirm')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Kod bilan yangi parol o‘rnatish' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.identifier, dto.code, dto.newPassword);
  }

  @Public()
  @Post('phone/request-code')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Fuqaro telefonini tasdiqlash kodi (murojaatdan oldin)' })
  requestPhoneCode(@Body() dto: RequestOtpDto) {
    return this.authService.requestPhoneVerification(dto.identifier);
  }

  @Public()
  @Post('phone/verify')
  @Throttle({ default: { ttl: 60000, limit: 8 } })
  @ApiOperation({ summary: 'Telefon tasdiqlash kodini tekshirish' })
  verifyPhone(@Body() dto: VerifyPhoneDto) {
    return this.authService.verifyPhone(dto.phone, dto.code);
  }

  @Post('fcm-token')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mobil qurilma FCM tokenini saqlash (push uchun)' })
  fcmToken(@CurrentUser() user: AuthUser, @Body() body: { token?: string }) {
    return this.authService.setFcmToken(user.id, body?.token ?? null);
  }

  @Public()
  @Post('telegram-link')
  @ApiOperation({ summary: 'Telegram chatni xodim akkauntiga bog‘lash (bot uchun)' })
  telegramLink(@Body() dto: TelegramLinkDto, @Headers('x-bot-secret') secret?: string) {
    if (secret !== process.env.BOT_API_SECRET) {
      throw new UnauthorizedException('Bot secret noto‘g‘ri');
    }
    return this.authService.telegramLink(dto);
  }
}
