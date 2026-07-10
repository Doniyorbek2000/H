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
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(
    private readonly service: FilesService,
    private readonly storage: StorageService,
  ) {}

  @Post('upload')
  @ApiBearerAuth()
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
  @ApiBearerAuth()
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  /** Faylni yuklab olish: lokal -> stream, S3 -> presigned redirect */
  @Public()
  @Get(':id/raw')
  @ApiOperation({ summary: 'Fayl kontentini olish (storage-agnostik)' })
  async raw(@Param('id') id: string, @Res() res: Response) {
    const { file, target } = await this.service.resolveRaw(id);
    if (target.kind === 'redirect') {
      return res.redirect(target.url);
    }
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.fileName)}"`);
    return res.sendFile(target.absPath);
  }
}
