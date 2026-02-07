import { ApiProperty } from '@nestjs/swagger';

class RiskMetadataDto {
  @ApiProperty({ example: true })
  highRiskCountry: boolean;

  @ApiProperty({ example: false })
  highRiskIndustry: boolean;

  @ApiProperty({ example: ['TAX_CERTIFICATE', 'REGISTRATION', 'INSURANCE_POLICY'] })
  missingDocuments: string[];

  @ApiProperty({ example: 0 })
  documentCompleteness: number;
}

class RiskBreakdownDto {
  @ApiProperty({ example: 60 })
  totalScore: number;

  @ApiProperty({ example: 40 })
  countryRisk: number;

  @ApiProperty({ example: 0 })
  industryRisk: number;

  @ApiProperty({ example: 20 })
  documentRisk: number;

  @ApiProperty({ type: RiskMetadataDto })
  metadata: RiskMetadataDto;
}

export class RecalculateRiskResponseDto {
  @ApiProperty({ example: '183c2b79-a0c2-42aa-b45f-66c761c122a3' })
  id: string;

  @ApiProperty({ example: 'Acme Corporation' })
  name: string;

  @ApiProperty({ example: '30-71234567-8' })
  taxId: string;

  @ApiProperty({ example: 'PA' })
  country: string;

  @ApiProperty({ example: 'software' })
  industry: string;

  @ApiProperty({ example: 'IN_REVIEW' })
  status: string;

  @ApiProperty({ example: 60 })
  riskScore: number;

  @ApiProperty({ example: '45a5fcef-2e1c-46fb-9821-f8422602b3bc' })
  createdById: string;

  @ApiProperty({ example: '45a5fcef-2e1c-46fb-9821-f8422602b3bc' })
  updatedById: string;

  @ApiProperty({ type: String, example: '2026-02-07T03:28:03.905Z' })
  createdAt: string;

  @ApiProperty({ type: String, example: '2026-02-07T20:31:35.810Z' })
  updatedAt: string;

  @ApiProperty({ example: 20 })
  previousScore: number;

  @ApiProperty({ example: 60 })
  newScore: number;

  @ApiProperty({ type: RiskBreakdownDto })
  breakdown: RiskBreakdownDto;
}
