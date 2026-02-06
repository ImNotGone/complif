import { Module } from '@nestjs/common';
import { BusinessesService } from './businesses.service';
import { BusinessesController } from './businesses.controller';
import { PrismaService } from 'src/prisma.service';
import { RiskEngineService } from './risk-engine.service';
import { PrismaModule } from 'src/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BusinessesController],
  providers: [BusinessesService, RiskEngineService],
})
export class BusinessesModule {}
