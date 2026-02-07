import { ApiProperty } from '@nestjs/swagger';
import { BusinessStatus } from '@prisma/client';
import { UserDto } from './user.dto';

class BusinessCountDto {
  @ApiProperty({ example: 0 })
  documents: number;

  @ApiProperty({ example: 0 })
  statusHistory: number;

  @ApiProperty({ example: 1 })
  riskCalculations: number;
}

export class BusinessResponseDto {
  @ApiProperty({ example: '183c2b79-a0c2-42aa-b45f-66c761c122a3' })
  id: string;

  @ApiProperty({ example: 'Acme Corporation' })
  name: string;

  @ApiProperty({ example: '30-71234567-8' })
  taxId: string;

  @ApiProperty({ example: 'AR' })
  country: string;

  @ApiProperty({ example: 'software' })
  industry: string;

  @ApiProperty({ enum: BusinessStatus })
  status: BusinessStatus;

  @ApiProperty({ example: 60 })
  riskScore: number;

  @ApiProperty({ example: '45a5fcef-2e1c-46fb-9821-f8422602b3bc' })
  createdById: string;

  @ApiProperty({ example: '45a5fcef-2e1c-46fb-9821-f8422602b3bc' })
  updatedById: string;

  @ApiProperty({ type: Date, example: '2026-02-07T03:28:03.905Z' })
  createdAt: Date;

  @ApiProperty({ type: Date, example: '2026-02-07T03:38:22.783Z' })
  updatedAt: Date;

  @ApiProperty({ type: UserDto })
  createdBy: UserDto;

  @ApiProperty({ type: UserDto })
  updatedBy: UserDto;

  @ApiProperty({ type: BusinessCountDto })
  _count: BusinessCountDto;
}
