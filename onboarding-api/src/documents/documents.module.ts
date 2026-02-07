import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { S3Service } from './s3.service';
import { PrismaModule } from 'src/prisma.module';
import { BusinessesModule } from 'src/businesses/businesses.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    BusinessesModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, S3Service],
  exports: [DocumentsService],
})
export class DocumentsModule {}