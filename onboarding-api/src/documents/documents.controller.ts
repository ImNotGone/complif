import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiParam,
  ApiNotFoundResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { AuthenticatedOnly } from '../auth/decorators/auth.decorator';
import { AdminOnly } from '../auth/decorators/admin.decorator';
import { UploadDocumentDto } from './dto/upload-document.dto'; 

@ApiTags('Documents')
@Controller('businesses/:businessId/documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @AuthenticatedOnly()
  @Post()
  @ApiOperation({ summary: 'Upload a document for a business' })
  @ApiParam({ name: 'businessId', description: 'Business UUID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['TAX_CERTIFICATE', 'REGISTRATION', 'INSURANCE_POLICY', 'OTHER'],
          example: 'TAX_CERTIFICATE',
        },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['type', 'file'],
    },
  })
  @ApiCreatedResponse({ description: 'Document uploaded successfully' })
  @ApiNotFoundResponse({ description: 'Business not found' })
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  }))
  async uploadDocument(
    @Param('businessId') businessId: string,
    @Body() uploadDocumentDto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const userId = req.user.userId;
    return this.documentsService.uploadDocument(
      businessId,
      uploadDocumentDto.type,
      file,
      userId,
    );
  }

  @AuthenticatedOnly()
  @Get()
  @ApiOperation({ summary: 'List all documents for a business' })
  @ApiParam({ name: 'businessId', description: 'Business UUID' })
  @ApiOkResponse({ description: 'List of documents' })
  @ApiNotFoundResponse({ description: 'Business not found' })
  listDocuments(@Param('businessId') businessId: string) {
    return this.documentsService.listDocuments(businessId);
  }

  @AuthenticatedOnly()
  @Get(':documentId')
  @ApiOperation({ summary: 'Get document details or download URL' })
  @ApiParam({ name: 'businessId', description: 'Business UUID' })
  @ApiParam({ name: 'documentId', description: 'Document UUID' })
  @ApiOkResponse({ description: 'Document details with download URL' })
  @ApiNotFoundResponse({ description: 'Document not found' })
  getDocument(
    @Param('businessId') businessId: string,
    @Param('documentId') documentId: string,
  ) {
    return this.documentsService.getDocument(businessId, documentId);
  }

  @AdminOnly()
  @Delete(':documentId')
  @ApiOperation({ summary: 'Soft delete a document (ADMIN only)' })
  @ApiParam({ name: 'businessId', description: 'Business UUID' })
  @ApiParam({ name: 'documentId', description: 'Document UUID' })
  @ApiOkResponse({ description: 'Document deleted successfully' })
  @ApiNotFoundResponse({ description: 'Document not found' })
  deleteDocument(
    @Param('businessId') businessId: string,
    @Param('documentId') documentId: string,
  ) {
    return this.documentsService.deleteDocument(businessId, documentId);
  }
}