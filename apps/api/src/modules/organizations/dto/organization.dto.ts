import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { OrganizationType } from '@prisma/client';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Chust tumani hokimligi' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: OrganizationType, example: OrganizationType.HOKIMLIK })
  @IsEnum(OrganizationType)
  type: OrganizationType;

  @ApiProperty({ example: 'Namangan viloyati' })
  @IsString()
  @IsNotEmpty()
  region: string;

  @ApiProperty({ example: 'Chust tumani' })
  @IsString()
  @IsNotEmpty()
  district: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto) {}
