import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('overview')
  overview(@CurrentUser() user: AuthUser) {
    return this.service.overview(user);
  }

  @Get('stats')
  stats(@CurrentUser() user: AuthUser) {
    return this.service.statusStats(user);
  }

  @Get('by-category')
  byCategory(@CurrentUser() user: AuthUser) {
    return this.service.byCategory(user);
  }

  @Get('by-mahalla')
  byMahalla(@CurrentUser() user: AuthUser) {
    return this.service.byMahalla(user);
  }

  @Get('overdue')
  overdue(@CurrentUser() user: AuthUser) {
    return this.service.overdueList(user);
  }

  @Get('kpi')
  kpi(@CurrentUser() user: AuthUser) {
    return this.service.kpi(user);
  }

  @Get('trends')
  trends(@Query('days') days: string, @CurrentUser() user: AuthUser) {
    const d = Math.min(Math.max(parseInt(days || '30', 10) || 30, 7), 90);
    return this.service.trends(user, d);
  }

  @Get('map')
  mapData(@CurrentUser() user: AuthUser) {
    return this.service.mapData(user);
  }
}
