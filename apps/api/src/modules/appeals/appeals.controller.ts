import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppealPriority, AppealSource, AppealStatus, Role } from '@prisma/client';
import { AppealsService } from './appeals.service';
import { FilesService, multerOptions } from '../files/files.service';
import {
  AssignAppealDto,
  ChangeStatusDto,
  CloseDto,
  CommentDto,
  CreateAppealDto,
  MergeAppealDto,
  RateDto,
  RejectDto,
  UpdateAppealDto,
} from './dto/appeal.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

const STAFF_ROLES: Role[] = [
  Role.SUPER_ADMIN,
  Role.ADMIN,
  Role.OPERATOR,
  Role.MANAGER,
  Role.EXECUTOR,
  Role.LEADER,
];

@ApiTags('appeals')
@Controller('appeals')
export class AppealsController {
  constructor(
    private readonly service: AppealsService,
    private readonly filesService: FilesService,
  ) {}

  // ---------- PUBLIC (fuqaro/bot) ----------

  @Public()
  @Post('public')
  @ApiOperation({ summary: 'Fuqaro murojaati (autentifikatsiyasiz, web/bot)' })
  createPublic(@Body() dto: CreateAppealDto) {
    return this.service.create(dto, null);
  }

  @Public()
  @Get('track/:appealNumber')
  @ApiOperation({ summary: 'Murojaat holatini raqam bo‘yicha kuzatish' })
  track(@Param('appealNumber') appealNumber: string, @Query('phone') phone?: string) {
    return this.service.trackByNumber(appealNumber, phone);
  }

  @Public()
  @Post('track/:appealNumber/rate')
  @ApiOperation({ summary: 'Murojaatni raqam bo‘yicha baholash (bot uchun)' })
  rateByNumber(
    @Param('appealNumber') appealNumber: string,
    @Body() dto: RateDto & { chatId?: string },
  ) {
    return this.service.rateByNumber(appealNumber, dto, dto.chatId);
  }

  // ---------- STAFF ----------

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Murojaatlar ro‘yxati (rol bo‘yicha cheklangan)' })
  findAll(
    @Query() query: PaginationQueryDto,
    @Query('status') status: AppealStatus,
    @Query('priority') priority: AppealPriority,
    @Query('categoryId') categoryId: string,
    @Query('departmentId') departmentId: string,
    @Query('assignedToId') assignedToId: string,
    @Query('source') source: AppealSource,
    @Query('mahalla') mahalla: string,
    @Query('overdue') overdue: string,
    @Query('hasLocation') hasLocation: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findAll(
      {
        ...query,
        status,
        priority,
        categoryId,
        departmentId,
        assignedToId,
        source,
        mahalla,
        overdue,
        hasLocation,
      },
      user,
    );
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Murojaat yaratish (operator/fuqaro akkaunt bilan)' })
  create(@Body() dto: CreateAppealDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Get(':id')
  @ApiBearerAuth()
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(id, user);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(...STAFF_ROLES)
  update(@Param('id') id: string, @Body() dto: UpdateAppealDto, @CurrentUser() user: AuthUser) {
    return this.service.update(id, dto, user);
  }

  @Post(':id/analyze-ai')
  @ApiBearerAuth()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.OPERATOR, Role.MANAGER)
  @ApiOperation({ summary: 'AI tahlilni qayta ishga tushirish' })
  analyze(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.analyzeNow(id, user);
  }

  @Post(':id/assign')
  @ApiBearerAuth()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.OPERATOR, Role.MANAGER)
  assign(@Param('id') id: string, @Body() dto: AssignAppealDto, @CurrentUser() user: AuthUser) {
    return this.service.assign(id, dto, user);
  }

  @Post(':id/status')
  @ApiBearerAuth()
  @Roles(...STAFF_ROLES)
  changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.changeStatus(id, dto, user);
  }

  @Post(':id/comment')
  @ApiBearerAuth()
  addComment(@Param('id') id: string, @Body() dto: CommentDto, @CurrentUser() user: AuthUser) {
    return this.service.addComment(id, dto, user);
  }

  @Post(':id/attachments')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 5, multerOptions()))
  @ApiOperation({ summary: 'Murojaatga fayl biriktirish (max 5 ta)' })
  async uploadAttachments(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: AuthUser,
  ) {
    await this.service.findOne(id, user);
    return this.filesService.attachToAppeal(id, files, user.id);
  }

  @Post(':id/close')
  @ApiBearerAuth()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.OPERATOR, Role.MANAGER)
  close(@Param('id') id: string, @Body() dto: CloseDto, @CurrentUser() user: AuthUser) {
    return this.service.close(id, dto, user);
  }

  @Post(':id/reject')
  @ApiBearerAuth()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.OPERATOR, Role.MANAGER)
  reject(@Param('id') id: string, @Body() dto: RejectDto, @CurrentUser() user: AuthUser) {
    return this.service.reject(id, dto, user);
  }

  @Post(':id/reopen')
  @ApiBearerAuth()
  reopen(@Param('id') id: string, @Body() dto: CommentDto, @CurrentUser() user: AuthUser) {
    return this.service.reopen(id, dto, user);
  }

  @Post(':id/rate')
  @ApiBearerAuth()
  rate(@Param('id') id: string, @Body() dto: RateDto, @CurrentUser() user: AuthUser) {
    return this.service.rate(id, dto, user);
  }

  @Post(':id/merge')
  @ApiBearerAuth()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.OPERATOR, Role.MANAGER)
  @ApiOperation({ summary: 'Takroriy murojaatni asosiy murojaatga birlashtirish' })
  merge(@Param('id') id: string, @Body() dto: MergeAppealDto, @CurrentUser() user: AuthUser) {
    return this.service.merge(id, dto.targetAppealNumber, dto.comment, user);
  }

  @Post(':id/response-draft')
  @ApiBearerAuth()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.OPERATOR, Role.MANAGER, Role.EXECUTOR)
  @ApiOperation({ summary: 'Fuqaroga AI javob loyihasini yaratish' })
  responseDraft(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.generateResponseDraft(id, user);
  }
}
