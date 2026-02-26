import { Module } from '@nestjs/common';
import { TaxIdModule } from './tax-id/tax-id.module';

@Module({
  imports: [TaxIdModule],
})
export class AppModule {}
