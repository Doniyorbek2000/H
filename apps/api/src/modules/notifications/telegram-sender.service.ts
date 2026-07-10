import { Injectable, Logger } from '@nestjs/common';

/**
 * Telegram Bot API orqali xabar yuborish (API tomonidan chiqib ketadigan xabarlar).
 * Bot jarayoni alohida app (apps/bot), lekin API notification yuborishda
 * to'g'ridan-to'g'ri Bot API'dan foydalanadi.
 */
@Injectable()
export class TelegramSenderService {
  private readonly logger = new Logger(TelegramSenderService.name);

  private get token(): string | undefined {
    return process.env.TELEGRAM_BOT_TOKEN || undefined;
  }

  get enabled(): boolean {
    return Boolean(this.token);
  }

  async sendMessage(
    chatId: string,
    text: string,
    inlineButtons?: { text: string; callback_data: string }[][],
  ): Promise<boolean> {
    if (!this.token || !chatId) return false;
    try {
      const res = await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          ...(inlineButtons ? { reply_markup: { inline_keyboard: inlineButtons } } : {}),
        }),
      });
      if (!res.ok) {
        this.logger.warn(`Telegram sendMessage xatosi: ${res.status}`);
        return false;
      }
      return true;
    } catch (e) {
      this.logger.warn(`Telegram yuborishda xato: ${(e as Error).message}`);
      return false;
    }
  }
}
