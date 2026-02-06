import { IsString, IsNotEmpty, IsISO31661Alpha2, IsIn } from 'class-validator';

export class CreateBusinessDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  taxId: string;

  @IsISO31661Alpha2() // Valida códigos de país como 'AR', 'US', 'MX'
  country: string;

  @IsString()
  @IsIn(['construction', 'security', 'casino', 'money_exchange', 'retail', 'software'])
  industry: string;
}