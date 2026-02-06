import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BusinessesModule } from './businesses/businesses.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [BusinessesModule, ConfigModule.forRoot({
      isGlobal: true,
    }),],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
