import {
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FilesService, multerOptions } from './files.service';

@ApiTags('files')
@ApiBearerAuth()
@Controller('files')
export class FilesController {
  constructor(private readonly service: FilesService) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', multerOptions()))
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Fayl yuborilmadi');
    return {
      fileName: file.originalname,
      filePath: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      url: `/static/${file.filename}`,
    };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
