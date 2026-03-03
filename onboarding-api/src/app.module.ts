import { Module } from '@nestjs/common';
import { BusinessesModule } from './businesses/businesses.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma.module';
import { DocumentsModule } from './documents/documents.module';
import { WinstonModule } from './logging/winston.module';

@Module({
  imports: [
    WinstonModule.forRoot({ context: 'AppModule' }),
    BusinessesModule, 
    ConfigModule.forRoot({
    isGlobal: true,
  }), 
    AuthModule, 
    PrismaModule, 
    DocumentsModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
