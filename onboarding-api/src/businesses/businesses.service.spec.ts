import { Test, TestingModule } from '@nestjs/testing';
import { BusinessesService } from './businesses.service';
import { RiskEngineService } from './risk-engine.service';
import { PrismaService } from '../prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BusinessStatus, DocumentType } from '@prisma/client';

const USER_ID = 'user-uuid-1';
const BUSINESS_ID = 'business-uuid-1';

const mockBusiness = {
  id: BUSINESS_ID,
  name: 'Acme Corporation',
  taxId: '30712345678',
  country: 'AR',
  industry: 'software',
  status: BusinessStatus.PENDING,
  riskScore: 20,
  createdById: USER_ID,
  updatedById: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  createdBy: { email: 'admin@complif.com', role: 'ADMIN' },
  updatedBy: null,
  documents: [],
  _count: { documents: 0, statusHistory: 1, riskCalculations: 1 },
};

const mockRiskResult = {
  totalScore: 20,
  countryRisk: 0,
  industryRisk: 0,
  documentRisk: 20,
  metadata: {
    highRiskCountry: false,
    highRiskIndustry: false,
    missingDocuments: [DocumentType.TAX_CERTIFICATE, DocumentType.REGISTRATION, DocumentType.INSURANCE_POLICY],
    documentCompleteness: 0,
  },
};

const mockPrisma = {
  business: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  statusHistory: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  riskCalculation: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
};

const mockRiskEngine = {
  calculateRisk: jest.fn(),
  determineInitialStatus: jest.fn(),
  shouldRequireReview: jest.fn(),
};

describe('BusinessesService', () => {
  let service: BusinessesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RiskEngineService, useValue: mockRiskEngine },
      ],
    }).compile();

    service = module.get<BusinessesService>(BusinessesService);
  });

  describe('create', () => {
    const dto = { name: 'Acme Corporation', taxId: '30712345678', country: 'AR', industry: 'software' };

    beforeEach(() => {
      mockPrisma.business.findUnique.mockResolvedValue(null); // no duplicate
      mockRiskEngine.calculateRisk.mockReturnValue(mockRiskResult);
      mockRiskEngine.determineInitialStatus.mockReturnValue(BusinessStatus.PENDING);
      mockPrisma.business.create.mockResolvedValue(mockBusiness);
    });

    it('creates and returns the business', async () => {
      const result = await service.create(dto, USER_ID);
      expect(result).toEqual(mockBusiness);
    });

    it('checks for duplicate taxId + country before creating', async () => {
      await service.create(dto, USER_ID);
      expect(mockPrisma.business.findUnique).toHaveBeenCalledWith({
        where: { taxId_country: { taxId: dto.taxId, country: dto.country } },
      });
    });

    it('throws BadRequestException if a duplicate business exists', async () => {
      mockPrisma.business.findUnique.mockResolvedValue(mockBusiness);
      await expect(service.create(dto, USER_ID)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException with a descriptive message for duplicate', async () => {
      mockPrisma.business.findUnique.mockResolvedValue(mockBusiness);
      await expect(service.create(dto, USER_ID)).rejects.toThrow(
        `Business with tax ID ${dto.taxId} already exists in ${dto.country}`,
      );
    });

    it('calculates risk with empty documents array on creation', async () => {
      await service.create(dto, USER_ID);
      expect(mockRiskEngine.calculateRisk).toHaveBeenCalledWith(dto.country, dto.industry, []);
    });

    it('uses risk engine score to determine initial status', async () => {
      await service.create(dto, USER_ID);
      expect(mockRiskEngine.determineInitialStatus).toHaveBeenCalledWith(mockRiskResult.totalScore);
    });

    it('creates the business with the correct riskScore and status', async () => {
      await service.create(dto, USER_ID);
      expect(mockPrisma.business.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            riskScore: mockRiskResult.totalScore,
            status: BusinessStatus.PENDING,
          }),
        }),
      );
    });

    it('creates an initial status history entry inside the same transaction', async () => {
      await service.create(dto, USER_ID);
      const createCall = mockPrisma.business.create.mock.calls[0][0];
      expect(createCall.data.statusHistory.create).toBeDefined();
      expect(createCall.data.statusHistory.create.status).toBe(BusinessStatus.PENDING);
    });

    it('creates an initial risk calculation entry inside the same transaction', async () => {
      await service.create(dto, USER_ID);
      const createCall = mockPrisma.business.create.mock.calls[0][0];
      expect(createCall.data.riskCalculations.create).toBeDefined();
      expect(createCall.data.riskCalculations.create.totalScore).toBe(mockRiskResult.totalScore);
    });
  });

  describe('findAll', () => {
    const filters = { page: 1, limit: 10 };

    const businessWithDocs = {
      ...mockBusiness,
      documents: [
        { type: DocumentType.TAX_CERTIFICATE },
        { type: DocumentType.REGISTRATION },
        { type: DocumentType.OTHER }, // not required
      ],
      _count: { documents: 3, statusHistory: 1, riskCalculations: 1 },
    };

    beforeEach(() => {
      mockPrisma.business.findMany.mockResolvedValue([businessWithDocs]);
      mockPrisma.business.count.mockResolvedValue(1);
    });

    it('returns paginated data, meta, and stats', async () => {
      const result = await service.findAll(filters);
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result).toHaveProperty('stats');
    });

    it('calculates correct meta pagination values', async () => {
      mockPrisma.business.count.mockResolvedValue(25);
      const result = await service.findAll({ page: 2, limit: 10 });
      expect(result.meta).toEqual({ page: 2, limit: 10, total: 25, totalPages: 3 });
    });

    it('replaces _count.documents with _count.requiredDocuments', async () => {
      const result = await service.findAll(filters);
      expect(result.data[0]._count).not.toHaveProperty('documents');
      expect(result.data[0]._count).toHaveProperty('requiredDocuments');
    });

    it('counts only required document types in requiredDocuments', async () => {
      // businessWithDocs has TAX_CERTIFICATE + REGISTRATION (2 required) + OTHER (not required)
      const result = await service.findAll(filters);
      expect(result.data[0]._count.requiredDocuments).toBe(2);
    });

    it('strips the documents array from the response', async () => {
      const result = await service.findAll(filters);
      expect(result.data[0]).not.toHaveProperty('documents');
    });

    it('applies status filter to the where clause', async () => {
      await service.findAll({ page: 1, limit: 10, status: BusinessStatus.PENDING });
      expect(mockPrisma.business.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: BusinessStatus.PENDING }) }),
      );
    });

    it('applies country filter to the where clause', async () => {
      await service.findAll({ page: 1, limit: 10, country: 'AR' });
      expect(mockPrisma.business.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ country: 'AR' }) }),
      );
    });

    it('applies case-insensitive search across name and taxId', async () => {
      await service.findAll({ page: 1, limit: 10, search: 'Acme' });
      const call = mockPrisma.business.findMany.mock.calls[0][0];
      expect(call.where.OR).toEqual([
        { name: { contains: 'Acme', mode: 'insensitive' } },
        { taxId: { contains: 'Acme', mode: 'insensitive' } },
      ]);
    });

    it('uses correct skip for page 2', async () => {
      await service.findAll({ page: 2, limit: 10 });
      expect(mockPrisma.business.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('runs 6 parallel queries for businesses + count + 4 status counts', async () => {
      await service.findAll(filters);
      // findMany x1, count x5
      expect(mockPrisma.business.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.business.count).toHaveBeenCalledTimes(5);
    });
  });

  describe('findOne', () => {
    const businessWithDocs = {
      ...mockBusiness,
      documents: [{ type: DocumentType.TAX_CERTIFICATE }, { type: DocumentType.REGISTRATION }],
    };

    it('returns the business with requiredDocuments count and no documents field', async () => {
      mockPrisma.business.findUnique.mockResolvedValue(businessWithDocs);
      const result = await service.findOne(BUSINESS_ID);
      expect(result._count.requiredDocuments).toBe(2);
      expect(result).not.toHaveProperty('documents');
    });

    it('throws NotFoundException when business does not exist', async () => {
      mockPrisma.business.findUnique.mockResolvedValue(null);
      await expect(service.findOne('ghost-id')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException with the business ID in the message', async () => {
      mockPrisma.business.findUnique.mockResolvedValue(null);
      await expect(service.findOne('ghost-id')).rejects.toThrow('ghost-id');
    });
  });

  describe('update', () => {
    const updateDto = { name: 'Acme Updated' };
    const updatedBusiness = { ...mockBusiness, name: 'Acme Updated' };

    beforeEach(() => {
      mockPrisma.business.findUnique.mockResolvedValue(mockBusiness);
      mockPrisma.business.update.mockResolvedValue(updatedBusiness);
    });

    it('returns the updated business', async () => {
      const result = await service.update(BUSINESS_ID, updateDto, USER_ID);
      expect(result.name).toBe('Acme Updated');
    });

    it('throws NotFoundException when business does not exist', async () => {
      mockPrisma.business.findUnique.mockResolvedValue(null);
      await expect(service.update('ghost-id', updateDto, USER_ID)).rejects.toThrow(NotFoundException);
    });

    it('does not recalculate risk when only name changes', async () => {
      await service.update(BUSINESS_ID, { name: 'New Name' }, USER_ID);
      expect(mockRiskEngine.calculateRisk).not.toHaveBeenCalled();
    });

    it('recalculates risk when country changes', async () => {
      mockPrisma.business.findUnique
        .mockResolvedValueOnce(mockBusiness) // first call in update()
        .mockResolvedValueOnce({ ...mockBusiness, documents: [] }); // call inside recalculateRisk()
      mockRiskEngine.calculateRisk.mockReturnValue(mockRiskResult);
      mockPrisma.business.update.mockResolvedValue({ ...mockBusiness, country: 'PA' });
      mockPrisma.riskCalculation.create.mockResolvedValue({});

      await service.update(BUSINESS_ID, { country: 'PA' }, USER_ID);

      expect(mockRiskEngine.calculateRisk).toHaveBeenCalled();
    });

    it('recalculates risk when industry changes', async () => {
      mockPrisma.business.findUnique
        .mockResolvedValueOnce(mockBusiness)
        .mockResolvedValueOnce({ ...mockBusiness, documents: [] });
      mockRiskEngine.calculateRisk.mockReturnValue(mockRiskResult);
      mockPrisma.business.update.mockResolvedValue({ ...mockBusiness, industry: 'casino' });
      mockPrisma.riskCalculation.create.mockResolvedValue({});

      await service.update(BUSINESS_ID, { industry: 'casino' }, USER_ID);

      expect(mockRiskEngine.calculateRisk).toHaveBeenCalled();
    });

    it('does not recalculate risk when country/industry are provided but unchanged', async () => {
      // Same values as mockBusiness
      await service.update(BUSINESS_ID, { country: 'AR', industry: 'software' }, USER_ID);
      expect(mockRiskEngine.calculateRisk).not.toHaveBeenCalled();
    });

    it('connects updatedBy to the requesting user', async () => {
      await service.update(BUSINESS_ID, updateDto, USER_ID);
      expect(mockPrisma.business.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            updatedBy: { connect: { id: USER_ID } },
          }),
        }),
      );
    });
  });

  describe('changeStatus', () => {
    const dto = { status: BusinessStatus.IN_REVIEW, reason: 'Manual review needed' };

    beforeEach(() => {
      mockPrisma.business.findUnique.mockResolvedValue(mockBusiness); // status: PENDING
      mockPrisma.business.update.mockResolvedValue({ ...mockBusiness, status: BusinessStatus.IN_REVIEW });
      mockPrisma.statusHistory.create.mockResolvedValue({});
    });

    it('returns the updated business with new status', async () => {
      const result = await service.changeStatus(BUSINESS_ID, dto, USER_ID);
      expect(result.status).toBe(BusinessStatus.IN_REVIEW);
    });

    it('throws NotFoundException when business does not exist', async () => {
      mockPrisma.business.findUnique.mockResolvedValue(null);
      await expect(service.changeStatus('ghost-id', dto, USER_ID)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when status is unchanged', async () => {
      const sameStatusDto = { status: BusinessStatus.PENDING }; // same as mockBusiness.status
      await expect(service.changeStatus(BUSINESS_ID, sameStatusDto, USER_ID)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException with descriptive message for duplicate status', async () => {
      const sameStatusDto = { status: BusinessStatus.PENDING };
      await expect(service.changeStatus(BUSINESS_ID, sameStatusDto, USER_ID)).rejects.toThrow(
        `Business is already in ${BusinessStatus.PENDING} status`,
      );
    });

    it('creates a status history entry after changing status', async () => {
      await service.changeStatus(BUSINESS_ID, dto, USER_ID);
      expect(mockPrisma.statusHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: BusinessStatus.IN_REVIEW,
            reason: 'Manual review needed',
          }),
        }),
      );
    });

    it('uses a default reason when none is provided', async () => {
      await service.changeStatus(BUSINESS_ID, { status: BusinessStatus.IN_REVIEW }, USER_ID);
      const createCall = mockPrisma.statusHistory.create.mock.calls[0][0];
      expect(createCall.data.reason).toContain(BusinessStatus.IN_REVIEW);
    });
  });

  describe('getStatusHistory', () => {
    const mockHistory = [
      { id: 'h1', businessId: BUSINESS_ID, status: BusinessStatus.PENDING, changedById: USER_ID, reason: null, createdAt: new Date(), changedBy: { email: 'admin@complif.com', role: 'ADMIN' } },
      { id: 'h2', businessId: BUSINESS_ID, status: BusinessStatus.IN_REVIEW, changedById: USER_ID, reason: 'Review', createdAt: new Date(), changedBy: { email: 'admin@complif.com', role: 'ADMIN' } },
    ];

    it('returns the full status history ordered ascending', async () => {
      mockPrisma.business.findUnique.mockResolvedValue({ id: BUSINESS_ID });
      mockPrisma.statusHistory.findMany.mockResolvedValue(mockHistory);

      const result = await service.getStatusHistory(BUSINESS_ID);

      expect(result).toEqual(mockHistory);
      expect(mockPrisma.statusHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'asc' } }),
      );
    });

    it('throws NotFoundException when business does not exist', async () => {
      mockPrisma.business.findUnique.mockResolvedValue(null);
      await expect(service.getStatusHistory('ghost-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getRiskHistory', () => {
    const mockRiskHistory = [
      { id: 'r1', businessId: BUSINESS_ID, totalScore: 60, countryRisk: 40, industryRisk: 0, documentRisk: 20, metadata: {}, createdAt: new Date() },
      { id: 'r2', businessId: BUSINESS_ID, totalScore: 20, countryRisk: 0, industryRisk: 0, documentRisk: 20, metadata: {}, createdAt: new Date() },
    ];

    it('returns risk history ordered descending (most recent first)', async () => {
      mockPrisma.business.findUnique.mockResolvedValue({ id: BUSINESS_ID });
      mockPrisma.riskCalculation.findMany.mockResolvedValue(mockRiskHistory);

      const result = await service.getRiskHistory(BUSINESS_ID);

      expect(result).toEqual(mockRiskHistory);
      expect(mockPrisma.riskCalculation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });

    it('throws NotFoundException when business does not exist', async () => {
      mockPrisma.business.findUnique.mockResolvedValue(null);
      await expect(service.getRiskHistory('ghost-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('recalculateRisk', () => {
    const businessWithDocs = {
      ...mockBusiness,
      riskScore: 20,
      documents: [{ type: DocumentType.TAX_CERTIFICATE, deletedAt: null }],
    };
    const newRiskResult = { ...mockRiskResult, totalScore: 60, countryRisk: 40 };

    beforeEach(() => {
      mockPrisma.business.findUnique.mockResolvedValue(businessWithDocs);
      mockRiskEngine.calculateRisk.mockReturnValue(newRiskResult);
      mockPrisma.business.update.mockResolvedValue({ ...mockBusiness, riskScore: 60 });
      mockPrisma.riskCalculation.create.mockResolvedValue({});
    });

    it('returns previousScore, newScore, and breakdown', async () => {
      const result = await service.recalculateRisk(BUSINESS_ID);
      expect(result.previousScore).toBe(20);
      expect(result.newScore).toBe(60);
      expect(result.breakdown).toEqual(newRiskResult);
    });

    it('throws NotFoundException when business does not exist', async () => {
      mockPrisma.business.findUnique.mockResolvedValue(null);
      await expect(service.recalculateRisk('ghost-id')).rejects.toThrow(NotFoundException);
    });

    it('calls calculateRisk with the business documents', async () => {
      await service.recalculateRisk(BUSINESS_ID);
      expect(mockRiskEngine.calculateRisk).toHaveBeenCalledWith(
        businessWithDocs.country,
        businessWithDocs.industry,
        businessWithDocs.documents,
      );
    });

    it('updates the business riskScore in the DB', async () => {
      await service.recalculateRisk(BUSINESS_ID);
      expect(mockPrisma.business.update).toHaveBeenCalledWith({
        where: { id: BUSINESS_ID },
        data: { riskScore: newRiskResult.totalScore },
      });
    });

    it('saves the new calculation to risk history', async () => {
      await service.recalculateRisk(BUSINESS_ID);
      expect(mockPrisma.riskCalculation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            businessId: BUSINESS_ID,
            totalScore: newRiskResult.totalScore,
          }),
        }),
      );
    });
  });
});