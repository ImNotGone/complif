import { ApiProperty } from '@nestjs/swagger';

export class VerifyTaxIdResponseDto {
  @ApiProperty({ example: true })
  valid: boolean;
}
