import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessStatus } from '@prisma/client';
import { UserDto } from './user.dto';

export class StatusHistoryResponseDto {
  @ApiProperty({ example: '806422e6-e55f-4014-b87c-447ab09a837c' })
  id: string;

  @ApiProperty({ example: '183c2b79-a0c2-42aa-b45f-66c761c122a3' })
  businessId: string;

  @ApiProperty({
    enum: BusinessStatus,
    example: BusinessStatus.IN_REVIEW,
  })
  status: BusinessStatus;

  @ApiProperty({ example: '45a5fcef-2e1c-46fb-9821-f8422602b3bc' })
  changedById: string;

  @ApiPropertyOptional({ example: 'DOCUMENTS ARE MISSING' })
  reason?: string;

  @ApiProperty({ type: String, example: '2026-02-07T03:37:32.386Z' })
  createdAt: string;

  @ApiProperty({ type: UserDto })
  changedBy: UserDto;
}
