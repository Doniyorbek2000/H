import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from './storage.service';

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
  ) {}

  async attachToAppeal(appealId: string, files: Express.Multer.File[], uploadedById?: string) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Fayl yuborilmadi');
    }
    const created = [];
    for (const f of files) {
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

  async findOne(id: string) {
    const file = await this.prisma.appealAttachment.findUnique({ where: { id } });
    if (!file) throw new NotFoundException('Fayl topilmadi');
    return { ...file, url: await this.storage.getUrl(file.filePath) };
  }

  async resolveRaw(id: string) {
    const file = await this.prisma.appealAttachment.findUnique({ where: { id } });
    if (!file) throw new NotFoundException('Fayl topilmadi');
    return { file, target: await this.storage.resolve(file.filePath) };
  }
}
