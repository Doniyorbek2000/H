import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { GeoService } from './geo.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';

const BOUNDARIES_KEY = 'geo.mahalla.boundaries';

@ApiTags('geo')
@Controller('geo')
export class GeoController {
  constructor(
    private readonly geo: GeoService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('geocode')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manzil -> koordinata (Nominatim)' })
  geocode(@Query('q') q: string) {
    if (!q?.trim()) throw new BadRequestException('q majburiy');
    return this.geo.geocode(q);
  }

  @Get('reverse')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Koordinata -> manzil' })
  reverse(@Query('lat') lat: string, @Query('lon') lon: string) {
    const la = parseFloat(lat);
    const lo = parseFloat(lon);
    if (Number.isNaN(la) || Number.isNaN(lo)) throw new BadRequestException('lat/lon noto‘g‘ri');
    return this.geo.reverse(la, lo);
  }

  /** Mahalla chegaralari (GeoJSON) — xaritada ko'rsatish uchun ochiq */
  @Public()
  @Get('mahalla-boundaries')
  @ApiOperation({ summary: 'Mahalla chegaralari (GeoJSON FeatureCollection)' })
  async boundaries(@Query('organizationId') organizationId?: string) {
    const setting = await this.prisma.setting.findFirst({
      where: { key: BOUNDARIES_KEY, organizationId: organizationId ?? null },
    });
    if (setting?.value) {
      try {
        return JSON.parse(setting.value);
      } catch {
        /* ignore */
      }
    }
    return { type: 'FeatureCollection', features: [] };
  }

  /** Admin mahalla chegaralari GeoJSON'ini yuklaydi */
  @Post('mahalla-boundaries')
  @ApiBearerAuth()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Mahalla chegaralari GeoJSON yuklash' })
  async setBoundaries(@Body() body: { geojson: unknown }, @CurrentUser() user: AuthUser) {
    const gj = body?.geojson as any;
    if (!gj || gj.type !== 'FeatureCollection' || !Array.isArray(gj.features)) {
      throw new BadRequestException('GeoJSON FeatureCollection kutilmoqda');
    }
    const organizationId = user.role === Role.SUPER_ADMIN ? null : user.organizationId;
    const value = JSON.stringify(gj);
    await this.prisma.setting.upsert({
      where: { organizationId_key: { organizationId: organizationId as any, key: BOUNDARIES_KEY } },
      update: { value },
      create: { organizationId, key: BOUNDARIES_KEY, value },
    });
    return { success: true, featureCount: gj.features.length };
  }
}
