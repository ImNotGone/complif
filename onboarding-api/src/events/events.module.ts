import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({}), // secret passed per-verify call, same as AuthModule
  ],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}