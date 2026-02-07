import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessStatus } from '@prisma/client';

export class ChangeBusinessStatusDto {
  @ApiProperty({
    enum: BusinessStatus,
    example: BusinessStatus.APPROVED,
  })
  @IsEnum(BusinessStatus)
  status: BusinessStatus;

  @ApiPropertyOptional({
    description: 'Reason for the status change',
    example: 'All documents verified',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
