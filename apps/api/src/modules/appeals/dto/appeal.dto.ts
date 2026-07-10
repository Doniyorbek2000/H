import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { AppealPriority, AppealSource, AppealStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateAppealDto {
  @ApiProperty({ example: 'Ko‘chada suv quvuri yorilib ketdi' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title: string;

  @ApiProperty({ example: 'Bizning mahallada ikki kundan beri suv chiqmayapti...' })
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description: string;

  @ApiProperty({ example: 'Aliyev Vali' })
  @IsString()
  @IsNotEmpty()
  citizenName: string;

  @ApiProperty({ example: '+998901234567' })
  @IsString()
  @IsNotEmpty()
  citizenPhone: string;

  @ApiPropertyOptional({ example: '12345678901234' })
  @IsOptional()
  @IsString()
  citizenJshshir?: string;

  @ApiPropertyOptional({ enum: AppealSource, default: AppealSource.WEB })
  @IsOptional()
  @IsEnum(AppealSource)
  source?: AppealSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'SUPER_ADMIN/public uchun; xodimlarda avtomatik' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ example: 'Guliston mahallasi' })
  @IsOptional()
  @IsString()
  mahalla?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Telegram chatId (bot orqali kelganda)' })
  @IsOptional()
  @IsString()
  citizenTelegramChatId?: string;
}

export class UpdateAppealDto extends PartialType(CreateAppealDto) {
  @ApiPropertyOptional({ enum: AppealPriority })
  @IsOptional()
  @IsEnum(AppealPriority)
  priority?: AppealPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  departmentId?: string;
}

export class AssignAppealDto {
  @ApiPropertyOptional({ description: 'Bo‘lim ID' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Mas’ul xodim ID' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional({ enum: AppealPriority })
  @IsOptional()
  @IsEnum(AppealPriority)
  priority?: AppealPriority;

  @ApiPropertyOptional({ description: 'Muddat (soat)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  deadlineHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}

export class ChangeStatusDto {
  @ApiProperty({ enum: AppealStatus })
  @IsEnum(AppealStatus)
  status: AppealStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}

export class CommentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  message: string;

  @ApiPropertyOptional({ default: false, description: 'Ichki izoh (fuqaroga ko‘rinmaydi)' })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}

export class RejectDto {
  @ApiProperty({ example: 'Murojaat hokimlik vakolatiga kirmaydi' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class CloseDto {
  @ApiPropertyOptional({ description: 'Yakuniy javob matni (bo‘sh bo‘lsa AI loyihasi ishlatiladi)' })
  @IsOptional()
  @IsString()
  finalResponse?: string;
}

export class RateDto {
  @ApiProperty({ minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feedback?: string;
}

export class MergeAppealDto {
  @ApiProperty({ example: 'SM-20260709-0001', description: 'Asosiy (saqlanadigan) murojaat raqami' })
  @IsString()
  @IsNotEmpty()
  targetAppealNumber: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}

export class TrackAppealDto {
  @ApiProperty({ example: 'SM-20260709-0001' })
  @IsString()
  @IsNotEmpty()
  appealNumber: string;

  @ApiPropertyOptional({ description: 'Telefon (tasdiqlash uchun)' })
  @IsOptional()
  @IsString()
  citizenPhone?: string;
}
