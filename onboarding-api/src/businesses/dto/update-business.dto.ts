import { PartialType } from '@nestjs/swagger';
import { CreateBusinessDto } from './create-business.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBusinessDto extends PartialType(CreateBusinessDto) {
  @ApiPropertyOptional({
    description: 'Business name',
    example: 'Acme Corporation Updated',
  })
  name?: string;

  @ApiPropertyOptional({
    description: 'Tax identification number (CUIT, RFC, etc.)',
    example: '30-71234567-8',
  })
  taxId?: string;

  @ApiPropertyOptional({
    description: 'Country code (ISO 2-letter)',
    example: 'AR',
    minLength: 2,
    maxLength: 2,
  })
  country?: string;

  @ApiPropertyOptional({
    description: 'Industry/sector',
    example: 'technology',
  })
  industry?: string;
}