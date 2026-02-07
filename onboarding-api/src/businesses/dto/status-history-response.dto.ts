import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessStatus } from '@prisma/client';

export class StatusHistoryResponseDto {
  @ApiProperty({
    enum: BusinessStatus,
    example: BusinessStatus.PENDING,
  })
  status: BusinessStatus;

  @ApiPropertyOptional({
    example: 'Initial submission',
  })
  reason?: string;

  @ApiProperty({
    example: '2026-02-06T18:20:00.000Z',
  })
  createdAt: Date;
}
