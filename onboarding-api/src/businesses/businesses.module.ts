import { Module } from '@nestjs/common';
import { BusinessesService } from './businesses.service';
import { BusinessesController } from './businesses.controller';
import { RiskEngineService } from './risk-engine.service';
import { PrismaModule } from 'src/prisma.module';
import { EventsModule } from 'src/events/events.module';

@Module({
  imports: [PrismaModule, EventsModule],
  controllers: [BusinessesController],
  providers: [BusinessesService, RiskEngineService],
  exports: [BusinessesService],
})
export class BusinessesModule {}