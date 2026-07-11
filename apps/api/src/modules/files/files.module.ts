import { forwardRef, Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { StorageService } from './storage.service';
import { AntivirusService } from './antivirus.service';
import { AppealsModule } from '../appeals/appeals.module';

@Module({
  imports: [forwardRef(() => AppealsModule)],
  controllers: [FilesController],
  providers: [FilesService, StorageService, AntivirusService],
  exports: [FilesService, StorageService],
})
export class FilesModule {}
