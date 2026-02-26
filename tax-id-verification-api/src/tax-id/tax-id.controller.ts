import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { TaxIdService } from './tax-id.service';
import { VerifyTaxIdDto } from './dto/verify-tax-id.dto';
import { VerifyTaxIdResponseDto } from './dto/verify-tax-id-response.dto';

@ApiTags('Tax ID')
@Controller('tax-id')
export class TaxIdController {
  constructor(private readonly service: TaxIdService) {}

  @Post('verify')
  @ApiOperation({ summary: 'Verify a tax ID for a country' })
  @ApiOkResponse({ type: VerifyTaxIdResponseDto })
  async verify(
    @Body() dto: VerifyTaxIdDto,
  ): Promise<VerifyTaxIdResponseDto> {
    const valid = await this.service.verify(dto.country, dto.taxId);
    return { valid };
  }
}
