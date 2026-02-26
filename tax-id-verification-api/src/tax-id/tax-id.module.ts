import { Module } from '@nestjs/common';
import { TaxIdController } from './tax-id.controller';
import { TaxIdService } from './tax-id.service';

@Module({
  controllers: [TaxIdController],
  providers: [TaxIdService],
})
export class TaxIdModule {}
