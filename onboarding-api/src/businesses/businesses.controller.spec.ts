import { Test, TestingModule } from '@nestjs/testing';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';
import { BusinessStatus } from '@prisma/client';
import { NotFoundException, BadRequestException } from '@nestjs/common';

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
  _count: { requiredDocuments: 0, statusHistory: 1, riskCalculations: 1 },
};

const mockPaginatedResponse = {
  data: [mockBusiness],
  meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
  stats: { pending: 1, inReview: 0, approved: 0, rejected: 0 },
};

const mockRiskResponse = {
  ...mockBusiness,
  previousScore: 20,
  newScore: 60,
  breakdown: { totalScore: 60, countryRisk: 40, industryRisk: 0, documentRisk: 20, metadata: {} },
};

const mockStatusHistory = [
  { id: 'h1', businessId: BUSINESS_ID, status: BusinessStatus.PENDING, changedById: USER_ID, reason: null, createdAt: new Date(), changedBy: { email: 'admin@complif.com', role: 'ADMIN' } },
];

const mockBusinessesService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  changeStatus: jest.fn(),
  getStatusHistory: jest.fn(),
  getRiskHistory: jest.fn(),
  recalculateRisk: jest.fn(),
};

const makeReq = (userId = USER_ID) => ({ user: { userId } });

describe('BusinessesController', () => {
  let controller: BusinessesController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BusinessesController],
      providers: [{ provide: BusinessesService, useValue: mockBusinessesService }],
    }).compile();

    controller = module.get<BusinessesController>(BusinessesController);
  });

  describe('create', () => {
    const dto = { name: 'Acme Corporation', taxId: '30712345678', country: 'AR', industry: 'software' };

    it('returns the created business', async () => {
      mockBusinessesService.create.mockResolvedValue(mockBusiness);
      const result = await controller.create(dto, makeReq());
      expect(result).toEqual(mockBusiness);
    });

    it('passes the dto and userId to the service', async () => {
      mockBusinessesService.create.mockResolvedValue(mockBusiness);
      await controller.create(dto, makeReq());
      expect(mockBusinessesService.create).toHaveBeenCalledWith(dto, USER_ID);
    });

    it('extracts userId from req.user.userId', async () => {
      mockBusinessesService.create.mockResolvedValue(mockBusiness);
      await controller.create(dto, makeReq('other-user-id'));
      expect(mockBusinessesService.create).toHaveBeenCalledWith(dto, 'other-user-id');
    });

    it('propagates BadRequestException for duplicate businesses', async () => {
      mockBusinessesService.create.mockRejectedValue(new BadRequestException('Duplicate'));
      await expect(controller.create(dto, makeReq())).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    const query = { page: 1, limit: 10 };

    it('returns paginated response', async () => {
      mockBusinessesService.findAll.mockResolvedValue(mockPaginatedResponse);
      const result = await controller.findAll(query as any);
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('passes the query object directly to the service', async () => {
      mockBusinessesService.findAll.mockResolvedValue(mockPaginatedResponse);
      await controller.findAll(query as any);
      expect(mockBusinessesService.findAll).toHaveBeenCalledWith(query);
    });

    it('passes status and country filters through to service', async () => {
      mockBusinessesService.findAll.mockResolvedValue(mockPaginatedResponse);
      const filteredQuery = { page: 1, limit: 10, status: BusinessStatus.PENDING, country: 'AR' };
      await controller.findAll(filteredQuery as any);
      expect(mockBusinessesService.findAll).toHaveBeenCalledWith(filteredQuery);
    });
  });

  describe('findOne', () => {
    it('returns the business by id', async () => {
      mockBusinessesService.findOne.mockResolvedValue(mockBusiness);
      const result = await controller.findOne(BUSINESS_ID);
      expect(result).toEqual(mockBusiness);
    });

    it('passes the id to the service', async () => {
      mockBusinessesService.findOne.mockResolvedValue(mockBusiness);
      await controller.findOne(BUSINESS_ID);
      expect(mockBusinessesService.findOne).toHaveBeenCalledWith(BUSINESS_ID);
    });

    it('propagates NotFoundException for unknown ids', async () => {
      mockBusinessesService.findOne.mockRejectedValue(new NotFoundException());
      await expect(controller.findOne('ghost-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const dto = { name: 'Acme Updated' };

    it('returns the updated business', async () => {
      mockBusinessesService.update.mockResolvedValue({ ...mockBusiness, name: 'Acme Updated' });
      const result = await controller.update(BUSINESS_ID, dto, makeReq());
      expect(result.name).toBe('Acme Updated');
    });

    it('passes id, dto, and userId to the service', async () => {
      mockBusinessesService.update.mockResolvedValue(mockBusiness);
      await controller.update(BUSINESS_ID, dto, makeReq());
      expect(mockBusinessesService.update).toHaveBeenCalledWith(BUSINESS_ID, dto, USER_ID);
    });

    it('propagates NotFoundException for unknown businesses', async () => {
      mockBusinessesService.update.mockRejectedValue(new NotFoundException());
      await expect(controller.update('ghost-id', dto, makeReq())).rejects.toThrow(NotFoundException);
    });
  });

  describe('changeStatus', () => {
    const dto = { status: BusinessStatus.IN_REVIEW, reason: 'Needs review' };

    it('returns the business with updated status', async () => {
      mockBusinessesService.changeStatus.mockResolvedValue({ ...mockBusiness, status: BusinessStatus.IN_REVIEW });
      const result = await controller.changeStatus(BUSINESS_ID, dto, makeReq());
      expect(result.status).toBe(BusinessStatus.IN_REVIEW);
    });

    it('passes id, dto, and userId to the service', async () => {
      mockBusinessesService.changeStatus.mockResolvedValue(mockBusiness);
      await controller.changeStatus(BUSINESS_ID, dto, makeReq());
      expect(mockBusinessesService.changeStatus).toHaveBeenCalledWith(BUSINESS_ID, dto, USER_ID);
    });

    it('propagates BadRequestException for duplicate status', async () => {
      mockBusinessesService.changeStatus.mockRejectedValue(new BadRequestException());
      await expect(controller.changeStatus(BUSINESS_ID, dto, makeReq())).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStatusHistory', () => {
    it('returns the status history array', async () => {
      mockBusinessesService.getStatusHistory.mockResolvedValue(mockStatusHistory);
      const result = await controller.getStatusHistory(BUSINESS_ID);
      expect(result).toEqual(mockStatusHistory);
    });

    it('passes the business id to the service', async () => {
      mockBusinessesService.getStatusHistory.mockResolvedValue(mockStatusHistory);
      await controller.getStatusHistory(BUSINESS_ID);
      expect(mockBusinessesService.getStatusHistory).toHaveBeenCalledWith(BUSINESS_ID);
    });

    it('propagates NotFoundException for unknown businesses', async () => {
      mockBusinessesService.getStatusHistory.mockRejectedValue(new NotFoundException());
      await expect(controller.getStatusHistory('ghost-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getRiskHistory', () => {
    const mockRiskHistory = [{ id: 'r1', businessId: BUSINESS_ID, totalScore: 60, createdAt: new Date() }];

    it('returns the risk history array', async () => {
      mockBusinessesService.getRiskHistory.mockResolvedValue(mockRiskHistory);
      const result = await controller.getRiskHistory(BUSINESS_ID);
      expect(result).toEqual(mockRiskHistory);
    });

    it('passes the business id to the service', async () => {
      mockBusinessesService.getRiskHistory.mockResolvedValue(mockRiskHistory);
      await controller.getRiskHistory(BUSINESS_ID);
      expect(mockBusinessesService.getRiskHistory).toHaveBeenCalledWith(BUSINESS_ID);
    });
  });

  describe('recalculateRisk', () => {
    const mockDto = { reason: 'Manual review' };

    it('returns the recalculation result with previousScore, newScore, and breakdown', async () => {
      mockBusinessesService.recalculateRisk.mockResolvedValue(mockRiskResponse);
      const result = await controller.recalculateRisk(BUSINESS_ID, mockDto);
      expect(result).toEqual(mockRiskResponse);
      expect(result).toHaveProperty('previousScore');
      expect(result).toHaveProperty('newScore');
      expect(result).toHaveProperty('breakdown');
    });

    it('passes the business id and reason to the service', async () => {
      mockBusinessesService.recalculateRisk.mockResolvedValue(mockRiskResponse);
      await controller.recalculateRisk(BUSINESS_ID, mockDto);
      expect(mockBusinessesService.recalculateRisk).toHaveBeenCalledWith(BUSINESS_ID, mockDto.reason);
    });

    it('propagates NotFoundException for unknown businesses', async () => {
      mockBusinessesService.recalculateRisk.mockRejectedValue(new NotFoundException());
      await expect(controller.recalculateRisk('ghost-id', mockDto)).rejects.toThrow(NotFoundException);
    });
  });
});