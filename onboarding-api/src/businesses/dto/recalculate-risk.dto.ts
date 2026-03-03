import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RecalculateRiskDto {
  @ApiProperty({
    example: 'Manual review requested',
    description: 'Reason for the risk recalculation',
    required: false,
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
