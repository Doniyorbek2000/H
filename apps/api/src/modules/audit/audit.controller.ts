import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuditService } from './audit.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.LEADER)
  findAll(
    @Query() query: PaginationQueryDto,
    @Query('entity') entity: string,
    @Query('action') action: string,
    @Query('userId') userId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.auditService.findAll({ ...query, entity, action, userId }, user);
  }
}
