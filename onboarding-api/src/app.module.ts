import { Module } from '@nestjs/common';
import { BusinessesModule } from './businesses/businesses.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma.module';
import { DocumentsModule } from './documents/documents.module';

@Module({
  imports: [BusinessesModule, ConfigModule.forRoot({
    isGlobal: true,
  }), AuthModule, PrismaModule, DocumentsModule],
  controllers: [],
  providers: [],
})
export class AppModule { }
