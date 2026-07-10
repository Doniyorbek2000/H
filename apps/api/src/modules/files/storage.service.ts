import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { existsSync, promises as fs } from 'fs';
import { join } from 'path';
import { uploadDir } from './files.service';

const S3_PREFIX = 's3:';

/**
 * Fayl saqlash abstraksiyasi: lokal disk (default) yoki S3/MinIO.
 * S3_ENDPOINT + S3_BUCKET + S3_ACCESS_KEY berilsa S3 rejimi yoqiladi.
 * filePath formati: lokal -> "uuid.jpg", S3 -> "s3:uuid.jpg".
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client | null = null;

  get s3Enabled(): boolean {
    return Boolean(
      process.env.S3_ENDPOINT && process.env.S3_BUCKET && process.env.S3_ACCESS_KEY,
    );
  }

  private get bucket(): string {
    return process.env.S3_BUCKET || '';
  }

  private client(): S3Client {
    if (!this.s3Client) {
      this.s3Client = new S3Client({
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY || '',
          secretAccessKey: process.env.S3_SECRET_KEY || '',
        },
        forcePathStyle: true, // MinIO uchun
      });
    }
    return this.s3Client;
  }

  /**
   * Multer diskka yozgan faylni yakuniy joyiga ko'chirish.
   * S3 yoqilgan bo'lsa — bucketga yuklab, lokal nusxani o'chiradi.
   */
  async store(localFilename: string, mimeType: string): Promise<string> {
    if (!this.s3Enabled) return localFilename;
    const localPath = join(uploadDir(), localFilename);
    try {
      const body = await fs.readFile(localPath);
      await this.client().send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: localFilename,
          Body: body,
          ContentType: mimeType,
        }),
      );
      await fs.unlink(localPath).catch(() => {});
      return `${S3_PREFIX}${localFilename}`;
    } catch (e) {
      // S3 xatosida lokal nusxa saqlanib qoladi — tizim ishlashda davom etadi
      this.logger.warn(`S3 yuklash xatosi (lokal saqlanadi): ${(e as Error).message}`);
      return localFilename;
    }
  }

  /** Fayl uchun URL: lokal -> /static/..., S3 -> presigned URL (1 soat) */
  async getUrl(filePath: string): Promise<string> {
    if (filePath.startsWith(S3_PREFIX)) {
      const key = filePath.slice(S3_PREFIX.length);
      return getSignedUrl(
        this.client(),
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        { expiresIn: 3600 },
      );
    }
    return `/static/${filePath}`;
  }

  /** Raw yuklab olish uchun: S3 bo'lsa redirect URL, lokal bo'lsa disk yo'li */
  async resolve(filePath: string): Promise<{ kind: 'redirect'; url: string } | { kind: 'local'; absPath: string }> {
    if (filePath.startsWith(S3_PREFIX)) {
      return { kind: 'redirect', url: await this.getUrl(filePath) };
    }
    const absPath = join(uploadDir(), filePath);
    if (!existsSync(absPath)) throw new NotFoundException('Fayl diskda topilmadi');
    return { kind: 'local', absPath };
  }

  async remove(filePath: string): Promise<void> {
    try {
      if (filePath.startsWith(S3_PREFIX)) {
        await this.client().send(
          new DeleteObjectCommand({ Bucket: this.bucket, Key: filePath.slice(S3_PREFIX.length) }),
        );
      } else {
        await fs.unlink(join(uploadDir(), filePath));
      }
    } catch {
      /* ignore */
    }
  }
}
