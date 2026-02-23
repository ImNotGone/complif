import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../prisma.service';
import { S3Service } from './s3.service';
import { BusinessesService } from '../businesses/businesses.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DocumentType } from '@prisma/client';

const BUSINESS_ID = 'business-uuid-1';
const DOCUMENT_ID = 'document-uuid-1';
const USER_ID = 'user-uuid-1';

const mockBusiness = {
  id: BUSINESS_ID,
  name: 'Acme Corporation',
  documents: [],
};

const mockDbDocument = {
  id: DOCUMENT_ID,
  type: DocumentType.TAX_CERTIFICATE,
  filename: 'tax.pdf',
  url: 'https://s3.example.com/old-url',
  s3Key: 'businesses/business-uuid-1/TAX_CERTIFICATE/123-tax.pdf',
  businessId: BUSINESS_ID,
  uploadedById: USER_ID,
  createdAt: new Date('2024-01-01'),
  deletedAt: null,
  uploadedBy: { email: 'admin@complif.com', role: 'ADMIN' },
};

const makeMockFile = (mimetype = 'application/pdf'): Express.Multer.File => ({
  fieldname: 'file',
  originalname: 'tax.pdf',
  encoding: '7bit',
  mimetype,
  buffer: Buffer.from('pdf content'),
  size: 1024,
  stream: null as any,
  destination: '',
  filename: 'tax.pdf',
  path: '',
});

const mockPrisma = {
  business: {
    findUnique: jest.fn(),
  },
  document: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockS3Service = {
  uploadFile: jest.fn(),
  getPresignedUrl: jest.fn(),
};

const mockBusinessesService = {
  recalculateRisk: jest.fn(),
};

describe('DocumentsService', () => {
  let service: DocumentsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: S3Service, useValue: mockS3Service },
        { provide: BusinessesService, useValue: mockBusinessesService },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  describe('uploadDocument', () => {
    const pdfFile = makeMockFile('application/pdf');

    beforeEach(() => {
      mockPrisma.business.findUnique.mockResolvedValue(mockBusiness);
      mockS3Service.uploadFile.mockResolvedValue('businesses/business-uuid-1/TAX_CERTIFICATE/123-tax.pdf');
      mockS3Service.getPresignedUrl.mockResolvedValue('https://s3.example.com/presigned-url');
      mockPrisma.document.create.mockResolvedValue(mockDbDocument);
      mockBusinessesService.recalculateRisk.mockResolvedValue({});
    });

    it('returns the created document', async () => {
      const result = await service.uploadDocument(BUSINESS_ID, DocumentType.TAX_CERTIFICATE, pdfFile, USER_ID);
      expect(result).toEqual(mockDbDocument);
    });

    it('throws NotFoundException when business does not exist', async () => {
      mockPrisma.business.findUnique.mockResolvedValue(null);
      await expect(
        service.uploadDocument(BUSINESS_ID, DocumentType.TAX_CERTIFICATE, pdfFile, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when file is not a PDF', async () => {
      const nonPdfFile = makeMockFile('image/png');
      await expect(
        service.uploadDocument(BUSINESS_ID, DocumentType.TAX_CERTIFICATE, nonPdfFile, USER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException with "Only PDF files are allowed" for non-PDF', async () => {
      const nonPdfFile = makeMockFile('image/png');
      await expect(
        service.uploadDocument(BUSINESS_ID, DocumentType.TAX_CERTIFICATE, nonPdfFile, USER_ID),
      ).rejects.toThrow('Only PDF files are allowed');
    });

    it('throws BadRequestException when a required document type already exists', async () => {
      mockPrisma.business.findUnique.mockResolvedValue({
        ...mockBusiness,
        documents: [{ type: DocumentType.TAX_CERTIFICATE }],
      });
      await expect(
        service.uploadDocument(BUSINESS_ID, DocumentType.TAX_CERTIFICATE, pdfFile, USER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException with a descriptive message for duplicate required doc', async () => {
      mockPrisma.business.findUnique.mockResolvedValue({
        ...mockBusiness,
        documents: [{ type: DocumentType.TAX_CERTIFICATE }],
      });
      await expect(
        service.uploadDocument(BUSINESS_ID, DocumentType.TAX_CERTIFICATE, pdfFile, USER_ID),
      ).rejects.toThrow('TAX CERTIFICATE document already exists');
    });

    it('allows uploading a second OTHER document (not a required type)', async () => {
      // OTHER is not in REQUIRED_DOCUMENT_TYPES so duplicate check does not apply
      mockPrisma.business.findUnique.mockResolvedValue({
        ...mockBusiness,
        documents: [{ type: DocumentType.OTHER }],
      });
      mockPrisma.document.create.mockResolvedValue({ ...mockDbDocument, type: DocumentType.OTHER });

      await expect(
        service.uploadDocument(BUSINESS_ID, DocumentType.OTHER, pdfFile, USER_ID),
      ).resolves.not.toThrow();
    });

    it('uploads the file to S3 with correct businessId and type', async () => {
      await service.uploadDocument(BUSINESS_ID, DocumentType.TAX_CERTIFICATE, pdfFile, USER_ID);
      expect(mockS3Service.uploadFile).toHaveBeenCalledWith(pdfFile, BUSINESS_ID, DocumentType.TAX_CERTIFICATE);
    });

    it('generates a presigned URL for the uploaded S3 key', async () => {
      const s3Key = 'businesses/business-uuid-1/TAX_CERTIFICATE/123-tax.pdf';
      mockS3Service.uploadFile.mockResolvedValue(s3Key);

      await service.uploadDocument(BUSINESS_ID, DocumentType.TAX_CERTIFICATE, pdfFile, USER_ID);

      expect(mockS3Service.getPresignedUrl).toHaveBeenCalledWith(s3Key);
    });

    it('saves document metadata to DB with correct fields', async () => {
      const s3Key = 'businesses/business-uuid-1/TAX_CERTIFICATE/123-tax.pdf';
      const presignedUrl = 'https://s3.example.com/presigned-url';
      mockS3Service.uploadFile.mockResolvedValue(s3Key);
      mockS3Service.getPresignedUrl.mockResolvedValue(presignedUrl);

      await service.uploadDocument(BUSINESS_ID, DocumentType.TAX_CERTIFICATE, pdfFile, USER_ID);

      expect(mockPrisma.document.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: DocumentType.TAX_CERTIFICATE,
            filename: pdfFile.originalname,
            url: presignedUrl,
            s3Key,
          }),
        }),
      );
    });

    describe('risk recalculation on upload', () => {
      it('recalculates risk after uploading a required document (TAX_CERTIFICATE)', async () => {
        await service.uploadDocument(BUSINESS_ID, DocumentType.TAX_CERTIFICATE, pdfFile, USER_ID);
        expect(mockBusinessesService.recalculateRisk).toHaveBeenCalledWith(BUSINESS_ID);
      });

      it('recalculates risk after uploading REGISTRATION', async () => {
        mockPrisma.document.create.mockResolvedValue({ ...mockDbDocument, type: DocumentType.REGISTRATION });
        await service.uploadDocument(BUSINESS_ID, DocumentType.REGISTRATION, pdfFile, USER_ID);
        expect(mockBusinessesService.recalculateRisk).toHaveBeenCalledWith(BUSINESS_ID);
      });

      it('recalculates risk after uploading INSURANCE_POLICY', async () => {
        mockPrisma.document.create.mockResolvedValue({ ...mockDbDocument, type: DocumentType.INSURANCE_POLICY });
        await service.uploadDocument(BUSINESS_ID, DocumentType.INSURANCE_POLICY, pdfFile, USER_ID);
        expect(mockBusinessesService.recalculateRisk).toHaveBeenCalledWith(BUSINESS_ID);
      });

      it('does NOT recalculate risk after uploading OTHER (not a required type)', async () => {
        mockPrisma.document.create.mockResolvedValue({ ...mockDbDocument, type: DocumentType.OTHER });
        await service.uploadDocument(BUSINESS_ID, DocumentType.OTHER, pdfFile, USER_ID);
        expect(mockBusinessesService.recalculateRisk).not.toHaveBeenCalled();
      });
    });
  });

  describe('listDocuments', () => {
    beforeEach(() => {
      mockPrisma.business.findUnique.mockResolvedValue(mockBusiness);
      mockPrisma.document.findMany.mockResolvedValue([mockDbDocument]);
    });

    it('returns the list of active documents', async () => {
      const result = await service.listDocuments(BUSINESS_ID);
      expect(result).toEqual([mockDbDocument]);
    });

    it('throws NotFoundException when business does not exist', async () => {
      mockPrisma.business.findUnique.mockResolvedValue(null);
      await expect(service.listDocuments(BUSINESS_ID)).rejects.toThrow(NotFoundException);
    });

    it('filters out soft-deleted documents (deletedAt: null)', async () => {
      await service.listDocuments(BUSINESS_ID);
      expect(mockPrisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ businessId: BUSINESS_ID, deletedAt: null }),
        }),
      );
    });

    it('returns documents ordered by createdAt descending', async () => {
      await service.listDocuments(BUSINESS_ID);
      expect(mockPrisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });

    it('includes uploadedBy (email and role) in the response', async () => {
      await service.listDocuments(BUSINESS_ID);
      expect(mockPrisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { uploadedBy: { select: { email: true, role: true } } },
        }),
      );
    });

    it('returns an empty array when no documents exist', async () => {
      mockPrisma.document.findMany.mockResolvedValue([]);
      const result = await service.listDocuments(BUSINESS_ID);
      expect(result).toEqual([]);
    });
  });

  describe('getDocument', () => {
    const freshUrl = 'https://s3.example.com/fresh-presigned-url';

    beforeEach(() => {
      mockPrisma.document.findFirst.mockResolvedValue(mockDbDocument);
      mockS3Service.getPresignedUrl.mockResolvedValue(freshUrl);
    });

    it('returns the document with a fresh presigned URL', async () => {
      const result = await service.getDocument(BUSINESS_ID, DOCUMENT_ID);
      expect(result.url).toBe(freshUrl);
    });

    it('does not return the old stale URL', async () => {
      const result = await service.getDocument(BUSINESS_ID, DOCUMENT_ID);
      expect(result.url).not.toBe(mockDbDocument.url);
    });

    it('returns all other document fields unchanged', async () => {
      const result = await service.getDocument(BUSINESS_ID, DOCUMENT_ID);
      expect(result.id).toBe(mockDbDocument.id);
      expect(result.type).toBe(mockDbDocument.type);
      expect(result.filename).toBe(mockDbDocument.filename);
      expect(result.s3Key).toBe(mockDbDocument.s3Key);
    });

    it('throws NotFoundException when document does not exist', async () => {
      mockPrisma.document.findFirst.mockResolvedValue(null);
      await expect(service.getDocument(BUSINESS_ID, 'ghost-doc')).rejects.toThrow(NotFoundException);
    });

    it('queries by documentId, businessId, and deletedAt: null', async () => {
      await service.getDocument(BUSINESS_ID, DOCUMENT_ID);
      expect(mockPrisma.document.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: DOCUMENT_ID, businessId: BUSINESS_ID, deletedAt: null },
        }),
      );
    });

    it('generates a fresh presigned URL using the document s3Key', async () => {
      await service.getDocument(BUSINESS_ID, DOCUMENT_ID);
      expect(mockS3Service.getPresignedUrl).toHaveBeenCalledWith(mockDbDocument.s3Key);
    });

    it('does not return soft-deleted documents (findFirst filters deletedAt: null)', async () => {
      // Simulate deleted doc not found (filtered by the where clause)
      mockPrisma.document.findFirst.mockResolvedValue(null);
      await expect(service.getDocument(BUSINESS_ID, DOCUMENT_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteDocument', () => {
    beforeEach(() => {
      mockPrisma.document.findFirst.mockResolvedValue(mockDbDocument);
      mockPrisma.document.update.mockResolvedValue({ ...mockDbDocument, deletedAt: new Date() });
      mockBusinessesService.recalculateRisk.mockResolvedValue({});
    });

    it('returns a success message', async () => {
      const result = await service.deleteDocument(BUSINESS_ID, DOCUMENT_ID);
      expect(result).toEqual({ message: 'Document deleted successfully' });
    });

    it('throws NotFoundException when document does not exist', async () => {
      mockPrisma.document.findFirst.mockResolvedValue(null);
      await expect(service.deleteDocument(BUSINESS_ID, 'ghost-doc')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when document belongs to a different business', async () => {
      // findFirst returns null because the businessId filter won't match
      mockPrisma.document.findFirst.mockResolvedValue(null);
      await expect(service.deleteDocument('other-business', DOCUMENT_ID)).rejects.toThrow(NotFoundException);
    });

    it('performs a soft delete by setting deletedAt to a date (not a hard delete)', async () => {
      await service.deleteDocument(BUSINESS_ID, DOCUMENT_ID);
      expect(mockPrisma.document.update).toHaveBeenCalledWith({
        where: { id: DOCUMENT_ID },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('never calls prisma.document.delete (always soft deletes)', async () => {
      await service.deleteDocument(BUSINESS_ID, DOCUMENT_ID);
      expect((mockPrisma.document as any).delete).toBeUndefined();
    });

    describe('risk recalculation on delete', () => {
      it('recalculates risk when a required document (TAX_CERTIFICATE) is deleted', async () => {
        mockPrisma.document.findFirst.mockResolvedValue({ ...mockDbDocument, type: DocumentType.TAX_CERTIFICATE });
        await service.deleteDocument(BUSINESS_ID, DOCUMENT_ID);
        expect(mockBusinessesService.recalculateRisk).toHaveBeenCalledWith(BUSINESS_ID);
      });

      it('recalculates risk when REGISTRATION is deleted', async () => {
        mockPrisma.document.findFirst.mockResolvedValue({ ...mockDbDocument, type: DocumentType.REGISTRATION });
        await service.deleteDocument(BUSINESS_ID, DOCUMENT_ID);
        expect(mockBusinessesService.recalculateRisk).toHaveBeenCalledWith(BUSINESS_ID);
      });

      it('recalculates risk when INSURANCE_POLICY is deleted', async () => {
        mockPrisma.document.findFirst.mockResolvedValue({ ...mockDbDocument, type: DocumentType.INSURANCE_POLICY });
        await service.deleteDocument(BUSINESS_ID, DOCUMENT_ID);
        expect(mockBusinessesService.recalculateRisk).toHaveBeenCalledWith(BUSINESS_ID);
      });

      it('does NOT recalculate risk when an OTHER document is deleted', async () => {
        mockPrisma.document.findFirst.mockResolvedValue({ ...mockDbDocument, type: DocumentType.OTHER });
        await service.deleteDocument(BUSINESS_ID, DOCUMENT_ID);
        expect(mockBusinessesService.recalculateRisk).not.toHaveBeenCalled();
      });
    });
  });
});