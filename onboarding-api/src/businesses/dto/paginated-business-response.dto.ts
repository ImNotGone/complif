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

export class PaginatedBusinessesResponseDto {
  @ApiProperty({ type: [BusinessResponseDto] })
  data: BusinessResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
