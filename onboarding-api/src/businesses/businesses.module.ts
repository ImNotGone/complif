import { Module } from '@nestjs/common';
import { BusinessesService } from './businesses.service';
import { BusinessesController } from './businesses.controller';
import { PrismaService } from 'src/prisma.service';
import { RiskEngineService } from './risk-engine.service';

@Module({
  controllers: [BusinessesController],
  providers: [BusinessesService, PrismaService, RiskEngineService],
})
export class BusinessesModule {}
