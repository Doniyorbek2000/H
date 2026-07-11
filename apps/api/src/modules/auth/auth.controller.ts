import { Body, Controller, Get, Headers, Ip, Post, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto, RegisterDto, TelegramLinkDto } from './dto/auth.dto';
import { Public } from '../../common/decorators/public.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
