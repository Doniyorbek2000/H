import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsNotEmpty, IsString } from 'class-validator';
import { SettingsService } from './settings.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';

class UpsertSettingDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  value: string;
}

@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.LEADER)
  getAll(@CurrentUser() user: AuthUser) {
    return this.service.getAll(user);
  }

  @Put()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  upsert(@Body() dto: UpsertSettingDto, @CurrentUser() user: AuthUser) {
    return this.service.upsert(dto.key, dto.value, user);
  }
}
