import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { RiskEngineService } from './risk-engine.service';
import { PrismaService } from '../prisma.service';
import { ChangeBusinessStatusDto } from './dto/change-business-status.dto';
import { FindBusinessesQueryDto } from './dto/find-business-query.dto';
import { DocumentType } from '@prisma/client';
import { EventsService } from '../events/events.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class BusinessesService {
  private readonly logger = new Logger(BusinessesService.name);

  private readonly REQUIRED_DOCUMENT_TYPES: DocumentType[] = [
    'TAX_CERTIFICATE',
    'REGISTRATION',
    'INSURANCE_POLICY',
  ];

  constructor(
    private prisma: PrismaService,
    private riskEngine: RiskEngineService,
    private eventsService: EventsService,
    private configService: ConfigService,
  ) {}

  async create(createBusinessDto: CreateBusinessDto, createdById: string) {
    this.logger.log(`Creating business: ${createBusinessDto.name} (Tax ID: ${createBusinessDto.taxId}) by user ${createdById}`);

    await this.validateTaxIdExternal(createBusinessDto.taxId, createBusinessDto.country);

    const existing = await this.prisma.business.findUnique({
      where: {
        taxId_country: {
          taxId: createBusinessDto.taxId,
          country: createBusinessDto.country,
        },
      },
    });

    if (existing) {
      this.logger.warn(
        `Duplicate business detected: Tax ID ${createBusinessDto.taxId} already exists in ${createBusinessDto.country}`,
      );
      throw new BadRequestException(
        `Business with tax ID ${createBusinessDto.taxId} already exists in ${createBusinessDto.country}`,
      );
    }

    const riskCalculation = this.riskEngine.calculateRisk(
      createBusinessDto.country,
      createBusinessDto.industry,
      [],
    );

    const initialStatus = this.riskEngine.determineInitialStatus(riskCalculation.totalScore);

    const newBusiness = await this.prisma.business.create({
      data: {
        name: createBusinessDto.name,
        taxId: createBusinessDto.taxId,
        country: createBusinessDto.country,
        industry: createBusinessDto.industry,
        riskScore: riskCalculation.totalScore,
        status: initialStatus,
        createdBy: { connect: { id: createdById } },
        statusHistory: {
          create: {
            status: initialStatus,
            changedBy: { connect: { id: createdById } },
            reason: `Initial creation. Risk Score: ${riskCalculation.totalScore}`,
          },
        },
        riskCalculations: {
          create: {
            totalScore: riskCalculation.totalScore,
            countryRisk: riskCalculation.countryRisk,
            industryRisk: riskCalculation.industryRisk,
            documentRisk: riskCalculation.documentRisk,
            metadata: riskCalculation.metadata,
            reason: 'Business created',
          },
        },
      },
      include: {
        createdBy: { select: { email: true, role: true } },
      },
    });

    this.logger.log(
      `Business created successfully: ${newBusiness.name} | Risk: ${riskCalculation.totalScore} | Status: ${initialStatus}`,
    );

    return newBusiness;
  }

  private async validateTaxIdExternal(taxId: string, country: string): Promise<boolean> {
    try {
      const baseUrl = this.configService.get<string>('TAX_ID_API_URL');
      if (!baseUrl) {
        throw new Error('TAX_ID_API_URL is not configured');
      }
      const url = `${baseUrl}/tax-id/verify`;

      this.logger.debug(`Validating Tax ID ${taxId} (${country}) in service ${url}`);

      return await axios.post(url, {
        country,
        taxId,
      });
      
    } catch (error) {
      this.logger.error(`Tax ID validation failed: ${error.message}`);
      throw new BadRequestException('Tax ID validation failed');
    }
  }

  async findAll(filters: FindBusinessesQueryDto) {
    const { page, limit, status, country, search } = filters;
    const skip = (page - 1) * limit;

    this.logger.debug(
      `Fetching businesses: page=${page}, limit=${limit}, status=${status}, country=${country}, search=${search}`,
    );

    const where: any = {};

    if (status) where.status = status;
    if (country) where.country = country;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { taxId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [businesses, total, pendingCount, inReviewCount, approvedCount, rejectedCount] =
      await Promise.all([
        this.prisma.business.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: {
                documents: { where: { deletedAt: null } },
                statusHistory: true,
                riskCalculations: true,
              },
            },
            documents: {
              where: { deletedAt: null },
              select: { type: true },
            },
          },
        }),
        this.prisma.business.count({ where }),
        this.prisma.business.count({ where: { status: 'PENDING' } }),
        this.prisma.business.count({ where: { status: 'IN_REVIEW' } }),
        this.prisma.business.count({ where: { status: 'APPROVED' } }),
        this.prisma.business.count({ where: { status: 'REJECTED' } }),
      ]);

    this.logger.log(`Retrieved ${businesses.length} businesses (total: ${total})`);

    return {
      data: businesses.map(b => this.transformBusiness(b)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      stats: {
        pending: pendingCount,
        inReview: inReviewCount,
        approved: approvedCount,
        rejected: rejectedCount,
      },
    };
  }

  async findOne(id: string) {
    this.logger.debug(`Fetching business with ID: ${id}`);

    const business = await this.prisma.business.findUnique({
      where: { id },
      include: {
        createdBy: { select: { email: true, role: true } },
        updatedBy: { select: { email: true, role: true } },
        _count: {
          select: {
            documents: { where: { deletedAt: null } },
            statusHistory: true,
            riskCalculations: true,
          },
        },
        documents: {
          where: { deletedAt: null },
          select: { type: true },
        },
      },
    });

    if (!business) {
      this.logger.warn(`Business not found: ${id}`);
      throw new NotFoundException(`Business with ID ${id} not found`);
    }
    
    this.logger.debug(`Business found: ${business.name}`);
    return this.transformBusiness(business);
  }

  async update(id: string, updateBusinessDto: UpdateBusinessDto, updatedById: string) {
    this.logger.log(`Updating business: ${id} by user ${updatedById}`);

    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) {
      this.logger.warn(`Business not found for update: ${id}`);
      throw new NotFoundException(`Business with ID ${id} not found`);
    }

    const reasons: string[] = [];

    // Check if industry changed and if the risk level changed
    if (updateBusinessDto.industry && updateBusinessDto.industry !== business.industry) {
      const wasHighRisk = this.riskEngine.isHighRiskIndustry(business.industry);
      const isNowHighRisk = this.riskEngine.isHighRiskIndustry(updateBusinessDto.industry);
      
      if (wasHighRisk !== isNowHighRisk) {
        const reason = `Industry changed from ${business.industry} to ${updateBusinessDto.industry} (risk level changed)`;
        reasons.push(reason);
        this.logger.log(`Industry risk level changed for business ${id}: ${business.industry} -> ${updateBusinessDto.industry}`);
      }
    }

    // Check if country changed and if the risk level changed
    if (updateBusinessDto.country && updateBusinessDto.country !== business.country) {
      const wasHighRisk = this.riskEngine.isHighRiskCountry(business.country);
      const isNowHighRisk = this.riskEngine.isHighRiskCountry(updateBusinessDto.country);
      
      if (wasHighRisk !== isNowHighRisk) {
        const reason = `Country changed from ${business.country} to ${updateBusinessDto.country} (risk level changed)`;
        reasons.push(reason);
        this.logger.log(`Country risk level changed for business ${id}: ${business.country} -> ${updateBusinessDto.country}`);
      }
    }

    const updated = await this.prisma.business.update({
      where: { id },
      data: {
        ...updateBusinessDto,
        updatedBy: { connect: { id: updatedById } },
      },
      include: {
        createdBy: { select: { email: true, role: true } },
        updatedBy: { select: { email: true, role: true } },
      },
    });

    if (reasons.length > 0) {
      const riskRecalcReason = reasons.join('; ');
      this.logger.log(`Auto-recalculating risk for business ${id}: ${riskRecalcReason}`);
      const response = await this.recalculateRisk(id, riskRecalcReason);
      updated.riskScore = response.newScore;
    }

    this.logger.log(`Business updated successfully: ${id}`);
    return updated;
  }

  async changeStatus(id: string, dto: ChangeBusinessStatusDto, changedById: string) {
    this.logger.log(`Changing status for business ${id} to ${dto.status} by user ${changedById}`);

    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) {
      this.logger.warn(`Business not found for status change: ${id}`);
      throw new NotFoundException(`Business with ID ${id} not found`);
    }

    if (business.status === dto.status) {
      this.logger.warn(`Attempted duplicate status change for business ${id}: already ${dto.status}`);
      throw new BadRequestException(`Business is already in ${dto.status} status`);
    }

    const updated = await this.prisma.business.update({
      where: { id },
      data: { status: dto.status },
    });

    const historyEntry = await this.prisma.statusHistory.create({
      data: {
        business: { connect: { id } },
        status: dto.status,
        changedBy: { connect: { id: changedById } },
        reason: dto.reason || `Status changed to ${dto.status}`,
      },
      include: {
        changedBy: { select: { email: true } },
      },
    });

    // Publish to Redis → fans out to all SSE-connected clients via every instance
    await this.eventsService.publish({
      type: 'business.status_changed',
      businessId: id,
      businessName: business.name,
      previousStatus: business.status,
      newStatus: dto.status,
      reason: historyEntry.reason || "",
      changedBy: historyEntry.changedBy.email,
      timestamp: historyEntry.createdAt.toISOString(),
    });

    this.logger.log(
      `NOTIFICATION: Business "${business.name}" status changed from ${business.status} to ${dto.status}`,
    );

    return updated;
  }

  async getStatusHistory(businessId: string) {
    this.logger.debug(`Fetching status history for business: ${businessId}`);

    const businessExists = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });

    if (!businessExists) {
      this.logger.warn(`Business not found for status history: ${businessId}`);
      throw new NotFoundException('Business not found');
    }

    const history = await this.prisma.statusHistory.findMany({
      where: { businessId },
      orderBy: { createdAt: 'asc' },
      include: {
        changedBy: { select: { email: true, role: true } },
      },
    });

    this.logger.debug(`Retrieved ${history.length} status history entries`);
    return history;
  }

  async getRiskHistory(businessId: string) {
    this.logger.debug(`Fetching risk history for business: ${businessId}`);

    const businessExists = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });

    if (!businessExists) {
      this.logger.warn(`Business not found for risk history: ${businessId}`);
      throw new NotFoundException('Business not found');
    }

    const history = await this.prisma.riskCalculation.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });

    this.logger.debug(`Retrieved ${history.length} risk calculation entries`);
    return history;
  }

  async recalculateRisk(id: string, reason?: string) {
    this.logger.log(`Recalculating risk for business: ${id}`);

    const business = await this.prisma.business.findUnique({
      where: { id },
      include: { documents: { where: { deletedAt: null } } },
    });

    if (!business) {
      this.logger.warn(`Business not found for risk recalculation: ${id}`);
      throw new NotFoundException(`Business with ID ${id} not found`);
    }

    const riskCalculation = this.riskEngine.calculateRisk(
      business.country,
      business.industry,
      business.documents,
    );

    const updated = await this.prisma.business.update({
      where: { id },
      data: { riskScore: riskCalculation.totalScore },
    });

    await this.prisma.riskCalculation.create({
      data: {
        businessId: id,
        totalScore: riskCalculation.totalScore,
        countryRisk: riskCalculation.countryRisk,
        industryRisk: riskCalculation.industryRisk,
        documentRisk: riskCalculation.documentRisk,
        metadata: riskCalculation.metadata,
        reason: reason || 'Manual recalculation',
      },
    });

    this.logger.log(
      `Risk recalculated for "${business.name}": ${business.riskScore} -> ${riskCalculation.totalScore}`,
    );

    return {
      ...updated,
      previousScore: business.riskScore,
      newScore: riskCalculation.totalScore,
      breakdown: riskCalculation,
    };
  }

  private transformBusiness(business: any) {
    const requiredDocCount = business.documents.filter((d) =>
      this.REQUIRED_DOCUMENT_TYPES.includes(d.type),
    ).length;

    const { documents, _count, ...rest } = business;
    const { documents: _removedDocs, ...countWithoutDocuments } = _count;

    return {
      ...rest,
      _count: {
        ...countWithoutDocuments,
        requiredDocuments: requiredDocCount,
      },
    };
  }
}