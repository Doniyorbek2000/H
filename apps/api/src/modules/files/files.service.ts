import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { unlink } from 'fs/promises';
import { extname, join } from 'path';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from './storage.service';
import { AntivirusService } from './antivirus.service';
import { AppealsService } from '../appeals/appeals.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';

const ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'audio/mpeg',
  'audio/ogg',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/aac',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export function uploadDir(): string {
  const dir = join(process.cwd(), process.env.UPLOAD_DIR || './uploads');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export function multerOptions() {
  const maxMb = parseInt(process.env.MAX_FILE_SIZE_MB || '20', 10);
  return {
    storage: diskStorage({
      destination: (_req, _file, cb) => cb(null, uploadDir()),
      filename: (_req, file, cb) => cb(null, `${uuid()}${extname(file.originalname)}`),
    }),
    limits: { fileSize: maxMb * 1024 * 1024 },
    fileFilter: (_req: unknown, file: Express.Multer.File, cb: (e: Error | null, ok: boolean) => void) => {
      if (!ALLOWED_MIME.includes(file.mimetype)) {
        return cb(new BadRequestException(`Fayl turi qo‘llab-quvvatlanmaydi: ${file.mimetype}`), false);
      }
      cb(null, true);
    },
  };
}

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly antivirus: AntivirusService,
    @Inject(forwardRef(() => AppealsService))
    private readonly appeals: AppealsService,
  ) {}

  /**
   * Fayl kontenti (magic-byte) haqiqatan ruxsat etilgan turmi — sarlavha
   * (mimetype) soxtalashtirishga qarshi. Matn/hujjatlar magic-byte'siz
   * bo'lishi mumkin, shuning uchun aniqlanmasa header'ga ishonamiz, lekin
   * aniqlangan tur ruxsat ro'yxatida bo'lishi shart.
   */
  private async assertRealMime(absPath: string, headerMime: string) {
    try {
      const ft = await import('file-type');
      const detected = await ft.fromFile(absPath);
      if (detected && !ALLOWED_MIME.includes(detected.mime)) {
        await unlink(absPath).catch(() => {});
        throw new BadRequestException(
          `Fayl kontenti mos emas (aniqlangan: ${detected.mime}). Soxta fayl rad etildi.`,
        );
      }
      // Rasm/video/audio da sarlavha bilan kontent turi mos kelishi kerak
      if (
        detected &&
        /^(image|video|audio)\//.test(headerMime) &&
        detected.mime !== headerMime &&
        !detected.mime.startsWith(headerMime.split('/')[0] + '/')
      ) {
        await unlink(absPath).catch(() => {});
        throw new BadRequestException('Fayl turi va kontenti mos kelmadi');
      }
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      // file-type xatosi (masalan matn fayli) — header validatsiyasiga tayanamiz
    }
  }

  async attachToAppeal(appealId: string, files: Express.Multer.File[], uploadedById?: string) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Fayl yuborilmadi');
    }
    const created = [];
    for (const f of files) {
      const abs = join(uploadDir(), f.filename);
      await this.assertRealMime(abs, f.mimetype);
      // Virusdan tekshirish (ClamAV sozlangan bo'lsa)
      const scan = await this.antivirus.scan(abs);
      if (!scan.clean) {
        await unlink(abs).catch(() => {});
        throw new BadRequestException(`Faylda zararli dastur aniqlandi: ${scan.signature}`);
      }
      const filePath = await this.storage.store(f.filename, f.mimetype);
      created.push(
        await this.prisma.appealAttachment.create({
          data: {
            appealId,
            fileName: Buffer.from(f.originalname, 'latin1').toString('utf8'),
            filePath,
            mimeType: f.mimetype,
            size: f.size,
            uploadedById,
          },
        }),
      );
    }
    return created;
  }

  /** Faylni topib, so'rovchining unga (murojaat orqali) kirish huquqini tekshiradi */
  private async findWithAccess(id: string, actor: AuthUser) {
    const file = await this.prisma.appealAttachment.findUnique({
      where: { id },
      include: {
        appeal: { select: { organizationId: true, assignedToId: true, createdById: true } },
      },
    });
    if (!file) throw new NotFoundException('Fayl topilmadi');
    this.appeals.assertAccess(file.appeal, actor);
    return file;
  }

  async findOne(id: string, actor: AuthUser) {
    const file = await this.findWithAccess(id, actor);
    // Lokal fayllar himoyalangan endpoint orqali; S3 esa qisqa muddatli presigned URL
    const url = file.filePath.startsWith('s3:')
      ? await this.storage.getUrl(file.filePath)
      : `/files/${file.id}/raw`;
    return { ...file, appeal: undefined, url };
  }

  async resolveRaw(id: string, actor: AuthUser) {
    const file = await this.findWithAccess(id, actor);
    return { file, target: await this.storage.resolve(file.filePath) };
  }
}
