import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DocumentType } from '@prisma/client';

export class UploadDocumentDto {
  @ApiProperty({
    enum: DocumentType,
    example: DocumentType.TAX_CERTIFICATE,
    description: 'Type of document being uploaded',
  })
  @IsEnum(DocumentType)
  type: DocumentType;
}