import { Injectable, Logger } from '@nestjs/common';
import { createSign } from 'crypto';

/**
 * Firebase Cloud Messaging (HTTP v1) orqali mobil push.
 * FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
 * (service account) berilsa yoqiladi; aks holda no-op — tizim ishlayveradi.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private cachedToken: { value: string; expiresAt: number } | null = null;

  get enabled(): boolean {
    return Boolean(
      process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY,
    );
  }

  private base64url(input: Buffer | string): string {
    return Buffer.from(input).toString('base64url');
  }

  /** Service account bilan OAuth2 access token olish (RS256 JWT, ~50 daqiqa kesh) */
  private async getAccessToken(): Promise<string | null> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now()) {
      return this.cachedToken.value;
    }
    try {
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL!;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n');
      const iat = Math.floor(Date.now() / 1000);
      const header = this.base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
      const claims = this.base64url(
        JSON.stringify({
          iss: clientEmail,
          scope: 'https://www.googleapis.com/auth/firebase.messaging',
          aud: 'https://oauth2.googleapis.com/token',
          iat,
          exp: iat + 3600,
        }),
      );
      const signer = createSign('RSA-SHA256');
      signer.update(`${header}.${claims}`);
      const signature = signer.sign(privateKey).toString('base64url');
      const assertion = `${header}.${claims}.${signature}`;

      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion,
        }),
      });
      if (!res.ok) {
        this.logger.warn(`FCM OAuth xatosi: ${res.status} ${await res.text()}`);
        return null;
      }
      const data: any = await res.json();
      this.cachedToken = {
        value: data.access_token,
        expiresAt: Date.now() + 50 * 60 * 1000,
      };
      return this.cachedToken.value;
    } catch (e) {
      this.logger.warn(`FCM token olishda xato: ${(e as Error).message}`);
      return null;
    }
  }

  /** Qurilmaga push yuborish. Xatoda false — asosiy oqim buzilmaydi. */
  async sendToDevice(
    fcmToken: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<boolean> {
    if (!this.enabled || !fcmToken) return false;
    const accessToken = await this.getAccessToken();
    if (!accessToken) return false;
    try {
      const res = await fetch(
        `https://fcm.googleapis.com/v1/projects/${process.env.FIREBASE_PROJECT_ID}/messages:send`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              token: fcmToken,
              notification: { title, body },
              ...(data ? { data } : {}),
              android: { priority: 'HIGH' },
            },
          }),
        },
      );
      if (!res.ok) {
        this.logger.warn(`FCM yuborish xatosi: ${res.status}`);
        return false;
      }
      return true;
    } catch (e) {
      this.logger.warn(`FCM yuborishda xato: ${(e as Error).message}`);
      return false;
    }
  }
}
