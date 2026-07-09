import { Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportType, Role } from '@prisma/client';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

const REPORT_ROLES: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.LEADER, Role.MANAGER];

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Post('daily')
  @Roles(...REPORT_ROLES)
  @ApiOperation({ summary: 'Kunlik hisobot yaratish (AI xulosa bilan)' })
  daily(@CurrentUser() user: AuthUser, @Query('organizationId') organizationId?: string) {
    return this.service.generate(ReportType.DAILY, user, organizationId);
  }

  @Post('weekly')
  @Roles(...REPORT_ROLES)
  weekly(@CurrentUser() user: AuthUser, @Query('organizationId') organizationId?: string) {
    return this.service.generate(ReportType.WEEKLY, user, organizationId);
  }

  @Post('monthly')
  @Roles(...REPORT_ROLES)
  monthly(@CurrentUser() user: AuthUser, @Query('organizationId') organizationId?: string) {
    return this.service.generate(ReportType.MONTHLY, user, organizationId);
  }

  @Get()
  findAll(
    @Query() query: PaginationQueryDto,
    @Query('type') type: ReportType,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findAll({ ...query, type }, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(id, user);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Hisobotni yuklab olish (?format=pdf|xlsx)' })
  async download(
    @Param('id') id: string,
    @Query('format') format: string,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    if (format === 'xlsx') {
      const { buffer, fileName } = await this.service.downloadExcel(id, user);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      return res.send(buffer);
    }
    const { buffer, fileName } = await this.service.downloadPdf(id, user);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(buffer);
  }
}
