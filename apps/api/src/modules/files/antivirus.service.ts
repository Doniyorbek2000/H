import { Injectable, Logger } from '@nestjs/common';
import { createConnection } from 'net';
import { createReadStream } from 'fs';

/**
 * ClamAV orqali fayllarni virusdan tekshirish (INSTREAM protokoli, TCP).
 * CLAMAV_HOST + CLAMAV_PORT berilsa yoqiladi (docker: clamav servisi).
 * Sozlanmagan bo'lsa — no-op (true qaytaradi), tizim ishlashda davom etadi.
 */
@Injectable()
export class AntivirusService {
  private readonly logger = new Logger(AntivirusService.name);

  get enabled(): boolean {
    return Boolean(process.env.CLAMAV_HOST);
  }

  private get host(): string {
    return process.env.CLAMAV_HOST || 'localhost';
  }
  private get port(): number {
    return parseInt(process.env.CLAMAV_PORT || '3310', 10);
  }

  /**
   * Faylni skanerlaydi. Toza bo'lsa true, virus topilsa false.
   * ClamAV ulanmasa (xato) — true (bloklamaymiz, log qoldiramiz).
   */
  async scan(absPath: string): Promise<{ clean: boolean; signature?: string }> {
    if (!this.enabled) return { clean: true };
    return new Promise((resolve) => {
      const socket = createConnection({ host: this.host, port: this.port });
      let response = '';
      const timer = setTimeout(() => {
        socket.destroy();
        this.logger.warn('ClamAV timeout — fayl o‘tkazib yuborildi');
        resolve({ clean: true });
      }, 15000);

      socket.on('connect', () => {
        socket.write('zINSTREAM\0');
        const stream = createReadStream(absPath, { highWaterMark: 64 * 1024 });
        stream.on('data', (chunk: string | Buffer) => {
          const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          const size = Buffer.alloc(4);
          size.writeUInt32BE(buf.length, 0);
          socket.write(size);
          socket.write(buf);
        });
        stream.on('end', () => {
          socket.write(Buffer.from([0, 0, 0, 0])); // tugatish
        });
        stream.on('error', () => {
          socket.destroy();
          clearTimeout(timer);
          resolve({ clean: true });
        });
      });
      socket.on('data', (d) => (response += d.toString()));
      socket.on('end', () => {
        clearTimeout(timer);
        // Javob: "stream: OK" yoki "stream: Eicar-Test-Signature FOUND"
        if (/FOUND/.test(response)) {
          const sig = response.replace(/.*stream:\s*/, '').replace(/\s*FOUND.*/, '').trim();
          resolve({ clean: false, signature: sig });
        } else {
          resolve({ clean: true });
        }
      });
      socket.on('error', (e) => {
        clearTimeout(timer);
        this.logger.warn(`ClamAV ulanish xatosi: ${e.message} — o‘tkazib yuborildi`);
        resolve({ clean: true });
      });
    });
  }
}
