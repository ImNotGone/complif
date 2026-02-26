import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class VerifyTaxIdDto {
  @ApiProperty({ example: 'US' })
  @IsString()
  @Length(2, 2)
  country: string;

  @ApiProperty({ example: '123456789' })
  @IsString()
  @Length(3, 50)
  taxId: string;
}
