import {
  IsString,
  IsNotEmpty,
  IsISO31661Alpha2,
  IsIn,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBusinessDto {
  @ApiProperty({
    description: 'Legal name of the business',
    example: 'Acme Corporation',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Tax identification number of the business',
    example: '30-71234567-8',
  })
  @IsString()
  @IsNotEmpty()
  taxId: string;

  @ApiProperty({
    description: 'ISO 3166-1 alpha-2 country code',
    example: 'AR',
  })
  @IsISO31661Alpha2()
  country: string;

  @ApiProperty({
    description: 'Industry category used for risk assessment',
    example: 'software',
    enum: [
      'construction',
      'security',
      'casino',
      'money_exchange',
      'retail',
      'software',
    ],
  })
  @IsString()
  @IsIn([
    'construction',
    'security',
    'casino',
    'money_exchange',
    'retail',
    'software',
  ])
  industry: string;
}
