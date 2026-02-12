import { ApiProperty } from '@nestjs/swagger';
import { BusinessResponseDto } from './business-response.dto';

class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}

class PaginatedBusinessesStatsDto {
  @ApiProperty({ example: 31 })
  pending: number;

  @ApiProperty({ example: 9 })
  inReview: number;

  @ApiProperty({ example: 1 })
  approved: number;

  @ApiProperty({ example: 1 })
  rejected: number;
}

export class PaginatedBusinessesResponseDto {
  @ApiProperty({ type: [BusinessResponseDto] })
  data: BusinessResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;

  @ApiProperty({type: PaginatedBusinessesStatsDto})
  stats: PaginatedBusinessesStatsDto;
}
