import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

/** apps/bot -> API ichki chaqiruvlarini himoyalash */
@Injectable()
export class BotSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const secret = request.headers['x-bot-secret'];
    if (!process.env.BOT_API_SECRET || secret !== process.env.BOT_API_SECRET) {
      throw new UnauthorizedException('Bot secret noto‘g‘ri');
    }
    return true;
  }
}
