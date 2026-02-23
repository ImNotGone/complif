import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DocumentType } from '@prisma/client';
import { S3Service } from './s3.service';
import { BusinessesService } from '../businesses/businesses.service';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  // Only these 3 are required and limited to 1 per type
  private readonly REQUIRED_DOCUMENT_TYPES: DocumentType[] = [
    "TAX_CERTIFICATE",
    "REGISTRATION",
    "INSURANCE_POLICY",
  ];

  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
    private businessesService: BusinessesService,
  ) { }

  async uploadDocument(
    businessId: string,
    type: DocumentType,
    file: Express.Multer.File,
    uploadedById: string,
  ) {
    this.logger.log(
      `Uploading document for business ${businessId}: type=${type}, filename=${file.originalname}, size=${file.size}`,
    );

    // 1. Verify business exists
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: {
        documents: {
          where: { deletedAt: null },
        },
      },
    });

    if (!business) {
      this.logger.warn(`Business not found for document upload: ${businessId}`);
      throw new NotFoundException('Business not found');
    }

    // 2. Validate file type (only PDFs allowed)
    if (file.mimetype !== 'application/pdf') {
      this.logger.warn(`Invalid file type attempted: ${file.mimetype}`);
      throw new BadRequestException('Only PDF files are allowed');
    }

    // 3. Check if this required document type already exists (only for required types)
    if (this.REQUIRED_DOCUMENT_TYPES.includes(type)) {
      const existingDoc = business.documents.find((d) => d.type === type);
      if (existingDoc) {
        this.logger.warn(
          `Document type ${type} already exists for business ${businessId}`,
        );
        throw new BadRequestException(
          `A ${type.replace('_', ' ')} document already exists. Please delete the existing one first.`,
        );
      }
    }

    // 4. Upload to S3
    const s3Key = await this.s3Service.uploadFile(file, businessId, type);
    this.logger.log(`File uploaded to S3: ${s3Key}`);

    // 5. Generate presigned URL for download
    const url = await this.s3Service.getPresignedUrl(s3Key);

    // 6. Save document metadata to database
    const document = await this.prisma.document.create({
      data: {
        type,
        filename: file.originalname,
        url,
        s3Key,
        business: {
          connect: { id: businessId },
        },
        uploadedBy: {
          connect: { id: uploadedById },
        },
      },
      include: {
        uploadedBy: {
          select: { email: true, role: true },
        },
      },
    });

    this.logger.log(
      `Document saved to database: ${document.id} (${document.filename})`,
    );

    // 7. Always recalculate if a required document was uploaded
    if (this.REQUIRED_DOCUMENT_TYPES.includes(type)) {
      this.logger.log(
        `Required document uploaded. Recalculating risk for business ${businessId}`,
      );
      await this.businessesService.recalculateRisk(businessId);
    } else {
      this.logger.debug(
        `Skipping risk recalculation for business ${businessId}: uploaded document is not \'required\'`,
      );
    }


    return document;
  }

  async listDocuments(businessId: string) {
    this.logger.debug(`Listing documents for business: ${businessId}`);

    // Verify business exists
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      this.logger.warn(`Business not found for document listing: ${businessId}`);
      throw new NotFoundException('Business not found');
    }

    const documents = await this.prisma.document.findMany({
      where: {
        businessId,
        deletedAt: null, // Only active documents
      },
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: {
          select: { email: true, role: true },
        },
      },
    });

    this.logger.debug(
      `Retrieved ${documents.length} documents for business ${businessId}`,
    );

    return documents;
  }

  async getDocument(businessId: string, documentId: string) {
    this.logger.debug(
      `Fetching document: ${documentId} for business: ${businessId}`,
    );

    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        businessId,
        deletedAt: null,
      },
      include: {
        uploadedBy: {
          select: { email: true, role: true },
        },
      },
    });

    if (!document) {
      this.logger.warn(`Document not found: ${documentId}`);
      throw new NotFoundException('Document not found');
    }

    // Generate fresh presigned URL (previous one may have expired)
    const freshUrl = await this.s3Service.getPresignedUrl(document.s3Key);

    this.logger.debug(`Generated fresh presigned URL for document ${documentId}`);

    return {
      ...document,
      url: freshUrl,
    };
  }

  async deleteDocument(businessId: string, documentId: string) {
    this.logger.log(
      `Soft deleting document: ${documentId} for business: ${businessId}`,
    );

    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        businessId,
        deletedAt: null,
      },
    });

    if (!document) {
      this.logger.warn(`Document not found for deletion: ${documentId}`);
      throw new NotFoundException('Document not found');
    }

    // Soft delete (mark as deleted)
    await this.prisma.document.update({
      where: { id: documentId },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`Document soft deleted: ${documentId} (${document.filename})`);

    // Always recalculate if a required document was deleted
    if (this.REQUIRED_DOCUMENT_TYPES.includes(document.type)) {
      this.logger.log(
        `Required document deleted. Recalculating risk for business ${businessId}`,
      );
      await this.businessesService.recalculateRisk(businessId);
    } else {
      this.logger.debug(
        `Skipping risk recalculation for business ${businessId}: deleted document is not \'required\'`,
      );
    }

    return {
      message: 'Document deleted successfully',
    };
  }
}