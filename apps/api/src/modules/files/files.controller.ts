import {
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { FilesService, multerOptions } from './files.service';
import { StorageService } from './storage.service';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('files')
@ApiBearerAuth()
@Controller('files')
export class FilesController {
  constructor(
    private readonly service: FilesService,
    private readonly storage: StorageService,
  ) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', multerOptions()))
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Fayl yuborilmadi');
    const filePath = await this.storage.store(file.filename, file.mimetype);
    return {
      fileName: file.originalname,
      filePath,
      mimeType: file.mimetype,
      size: file.size,
      url: await this.storage.getUrl(filePath),
    };
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(id, user);
  }

  /**
   * Fayl kontentini olish. Autentifikatsiya + murojaatga kirish huquqi talab qilinadi
   * (EXECUTOR faqat o'ziga biriktirilgan, CITIZEN faqat o'z murojaati fayllarini oladi).
   * Lokal -> stream, S3 -> qisqa muddatli presigned redirect.
   */
  @Get(':id/raw')
  @ApiOperation({ summary: 'Fayl kontentini olish (kirish huquqi tekshiriladi)' })
  async raw(@Param('id') id: string, @CurrentUser() user: AuthUser, @Res() res: Response) {
    const { file, target } = await this.service.resolveRaw(id, user);
    if (target.kind === 'redirect') {
      return res.redirect(target.url);
    }
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.fileName)}"`);
    return res.sendFile(target.absPath);
  }
}
