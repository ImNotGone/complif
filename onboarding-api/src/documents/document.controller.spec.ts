import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DocumentType } from '@prisma/client';

const BUSINESS_ID = 'business-uuid-1';
const DOCUMENT_ID = 'document-uuid-1';
const USER_ID = 'user-uuid-1';

const mockDocument = {
  id: DOCUMENT_ID,
  type: DocumentType.TAX_CERTIFICATE,
  filename: 'tax.pdf',
  url: 'https://s3.example.com/presigned-url',
  s3Key: 'businesses/business-uuid-1/TAX_CERTIFICATE/123-tax.pdf',
  businessId: BUSINESS_ID,
  uploadedById: USER_ID,
  createdAt: new Date('2024-01-01'),
  deletedAt: null,
  uploadedBy: { email: 'admin@complif.com', role: 'ADMIN' },
};

const makeMockFile = (): Express.Multer.File => ({
  fieldname: 'file',
  originalname: 'tax.pdf',
  encoding: '7bit',
  mimetype: 'application/pdf',
  buffer: Buffer.from('pdf content'),
  size: 1024,
  stream: null as any,
  destination: '',
  filename: 'tax.pdf',
  path: '',
});

const makeReq = (userId = USER_ID) => ({ user: { userId } });

const mockDocumentsService = {
  uploadDocument: jest.fn(),
  listDocuments: jest.fn(),
  getDocument: jest.fn(),
  deleteDocument: jest.fn(),
};

describe('DocumentsController', () => {
  let controller: DocumentsController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [{ provide: DocumentsService, useValue: mockDocumentsService }],
    }).compile();

    controller = module.get<DocumentsController>(DocumentsController);
  });

  describe('uploadDocument', () => {
    const dto = { type: DocumentType.TAX_CERTIFICATE };
    const file = makeMockFile();

    it('returns the uploaded document', async () => {
      mockDocumentsService.uploadDocument.mockResolvedValue(mockDocument);
      const result = await controller.uploadDocument(BUSINESS_ID, dto, file, makeReq());
      expect(result).toEqual(mockDocument);
    });

    it('passes businessId, type, file, and userId to the service', async () => {
      mockDocumentsService.uploadDocument.mockResolvedValue(mockDocument);
      await controller.uploadDocument(BUSINESS_ID, dto, file, makeReq());
      expect(mockDocumentsService.uploadDocument).toHaveBeenCalledWith(
        BUSINESS_ID,
        DocumentType.TAX_CERTIFICATE,
        file,
        USER_ID,
      );
    });

    it('extracts userId from req.user.userId', async () => {
      mockDocumentsService.uploadDocument.mockResolvedValue(mockDocument);
      await controller.uploadDocument(BUSINESS_ID, dto, file, makeReq('other-user'));
      expect(mockDocumentsService.uploadDocument).toHaveBeenCalledWith(
        BUSINESS_ID,
        DocumentType.TAX_CERTIFICATE,
        file,
        'other-user',
      );
    });

    it('throws BadRequestException when no file is provided', async () => {
      await expect(
        controller.uploadDocument(BUSINESS_ID, dto, null as any, makeReq()),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException with "File is required" when file is missing', async () => {
      await expect(
        controller.uploadDocument(BUSINESS_ID, dto, undefined as any, makeReq()),
      ).rejects.toThrow('File is required');
    });

    it('does not call the service when file is missing', async () => {
      try {
        await controller.uploadDocument(BUSINESS_ID, dto, null as any, makeReq());
      } catch {}
      expect(mockDocumentsService.uploadDocument).not.toHaveBeenCalled();
    });

    it('propagates NotFoundException from the service (business not found)', async () => {
      mockDocumentsService.uploadDocument.mockRejectedValue(new NotFoundException('Business not found'));
      await expect(
        controller.uploadDocument(BUSINESS_ID, dto, file, makeReq()),
      ).rejects.toThrow(NotFoundException);
    });

    it('propagates BadRequestException from the service (duplicate doc / non-PDF)', async () => {
      mockDocumentsService.uploadDocument.mockRejectedValue(
        new BadRequestException('Only PDF files are allowed'),
      );
      await expect(
        controller.uploadDocument(BUSINESS_ID, dto, file, makeReq()),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('listDocuments', () => {
    it('returns the list of documents', async () => {
      mockDocumentsService.listDocuments.mockResolvedValue([mockDocument]);
      const result = await controller.listDocuments(BUSINESS_ID);
      expect(result).toEqual([mockDocument]);
    });

    it('passes the businessId to the service', async () => {
      mockDocumentsService.listDocuments.mockResolvedValue([]);
      await controller.listDocuments(BUSINESS_ID);
      expect(mockDocumentsService.listDocuments).toHaveBeenCalledWith(BUSINESS_ID);
    });

    it('returns an empty array when no documents exist', async () => {
      mockDocumentsService.listDocuments.mockResolvedValue([]);
      const result = await controller.listDocuments(BUSINESS_ID);
      expect(result).toEqual([]);
    });

    it('propagates NotFoundException when business does not exist', async () => {
      mockDocumentsService.listDocuments.mockRejectedValue(new NotFoundException('Business not found'));
      await expect(controller.listDocuments(BUSINESS_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDocument', () => {
    it('returns the document with a fresh URL', async () => {
      mockDocumentsService.getDocument.mockResolvedValue(mockDocument);
      const result = await controller.getDocument(BUSINESS_ID, DOCUMENT_ID);
      expect(result).toEqual(mockDocument);
    });

    it('passes businessId and documentId to the service', async () => {
      mockDocumentsService.getDocument.mockResolvedValue(mockDocument);
      await controller.getDocument(BUSINESS_ID, DOCUMENT_ID);
      expect(mockDocumentsService.getDocument).toHaveBeenCalledWith(BUSINESS_ID, DOCUMENT_ID);
    });

    it('propagates NotFoundException when document does not exist', async () => {
      mockDocumentsService.getDocument.mockRejectedValue(new NotFoundException('Document not found'));
      await expect(controller.getDocument(BUSINESS_ID, 'ghost-doc')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteDocument', () => {
    it('returns the success message', async () => {
      mockDocumentsService.deleteDocument.mockResolvedValue({ message: 'Document deleted successfully' });
      const result = await controller.deleteDocument(BUSINESS_ID, DOCUMENT_ID);
      expect(result).toEqual({ message: 'Document deleted successfully' });
    });

    it('passes businessId and documentId to the service', async () => {
      mockDocumentsService.deleteDocument.mockResolvedValue({ message: 'Document deleted successfully' });
      await controller.deleteDocument(BUSINESS_ID, DOCUMENT_ID);
      expect(mockDocumentsService.deleteDocument).toHaveBeenCalledWith(BUSINESS_ID, DOCUMENT_ID);
    });

    it('propagates NotFoundException when document does not exist', async () => {
      mockDocumentsService.deleteDocument.mockRejectedValue(new NotFoundException('Document not found'));
      await expect(controller.deleteDocument(BUSINESS_ID, 'ghost-doc')).rejects.toThrow(NotFoundException);
    });
  });
});