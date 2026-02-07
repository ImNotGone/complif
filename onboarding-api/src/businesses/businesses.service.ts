import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { RiskEngineService } from './risk-engine.service';
import { PrismaService } from 'src/prisma.service';
import { ChangeBusinessStatusDto } from './dto/change-business-status.dto';
import { BusinessStatus } from '@prisma/client';

interface FindAllFilters {
  page: number;
  limit: number;
  status?: BusinessStatus;
  country?: string;
  search?: string;
}

@Injectable()
export class BusinessesService {
  private readonly logger = new Logger(BusinessesService.name);

  constructor(
    private prisma: PrismaService,
    private riskEngine: RiskEngineService,
  ) { }

  async create(createBusinessDto: CreateBusinessDto, createdById: string) {
    this.logger.log(`Creating business: ${createBusinessDto.name} (Tax ID: ${createBusinessDto.taxId})`);

    // 1. Validate Tax ID with external microservice (Mock)
    await this.validateTaxIdExternal(createBusinessDto.taxId, createBusinessDto.country);

    // 2. Check for duplicate business (same taxId + country)
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

    // 3. Calculate initial risk (no documents yet, so missing all)
    const riskCalculation = this.riskEngine.calculateRisk(
      createBusinessDto.country,
      createBusinessDto.industry,
      [], // No documents uploaded yet
    );

    // 4. Determine initial status
    const initialStatus = this.riskEngine.determineInitialStatus(
      riskCalculation.totalScore,
    );

    // 5. Create business with initial risk calculation and status history
    const newBusiness = await this.prisma.business.create({
      data: {
        ...createBusinessDto,
        riskScore: riskCalculation.totalScore,
        status: initialStatus,
        createdById,
        statusHistory: {
          create: {
            status: initialStatus,
            changedById: createdById,
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
          },
        },
      },
      include: {
        statusHistory: true,
        riskCalculations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    // 6. Log notification (webhook mock)
    this.logger.log(
      `Business created: ${newBusiness.name} [Risk: ${riskCalculation.totalScore}, Status: ${initialStatus}]`,
    );

    return newBusiness;
  }

  private async validateTaxIdExternal(
    taxId: string,
    country: string,
  ): Promise<boolean> {
    try {
      // TODO: Call external validation microservice
      // const response = await firstValueFrom(
      //   this.httpService.get(`http://validator-service:3001/validate`, {
      //     params: { taxId, country }
      //   })
      // );
      this.logger.debug(`Validating Tax ID ${taxId} (${country}) externally...`);

      return true;
    } catch (error) {
      this.logger.error(`Tax ID validation failed: ${error.message}`);
      throw new BadRequestException('Tax ID validation failed');
    }
  }

  async findAll(filters: FindAllFilters) {
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

    const [businesses, total] = await Promise.all([
      this.prisma.business.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { documents: true },
          },
        },
      }),
      this.prisma.business.count({ where }),
    ]);

    this.logger.log(`Retrieved ${businesses.length} businesses (total: ${total})`);


    return {
      data: businesses,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    this.logger.debug(`Fetching business with ID: ${id}`);

    const business = await this.prisma.business.findUnique({
      where: { id },
      include: {
        documents: {
          where: { deletedAt: null }, // Only active documents
          orderBy: { createdAt: 'desc' },
        },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          include: {
            changedBy: {
              select: { email: true, role: true },
            },
          },
        },
        riskCalculations: {
          orderBy: { createdAt: 'desc' },
          take: 5, // Last 5 calculations
        },
        createdBy: {
          select: { email: true, role: true },
        },
      },
    });

    if (!business) {
      this.logger.warn(`Business not found: ${id}`);

      throw new NotFoundException(`Business with ID ${id} not found`);
    }

    this.logger.debug(`Business found: ${business.name}`);

    return business;
  }

  async update(
    id: string,
    updateBusinessDto: UpdateBusinessDto,
    updatedById: string,
  ) {
    this.logger.log(`Updating business: ${id}`);

    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) {
      this.logger.warn(`Business not found for update: ${id}`);
      throw new NotFoundException(`Business with ID ${id} not found`);
    }

    // Check if industry or country changed (requires risk recalc)
    const needsRiskRecalc =
      (updateBusinessDto.industry && updateBusinessDto.industry !== business.industry) ||
      (updateBusinessDto.country && updateBusinessDto.country !== business.country);

    if (needsRiskRecalc) {
      this.logger.log(
        `Risk-relevant fields changed for business ${id}. Country: ${business.country} -> ${updateBusinessDto.country}, Industry: ${business.industry} -> ${updateBusinessDto.industry}`,
      );
    }

    const updated = await this.prisma.business.update({
      where: { id },
      data: {
        ...updateBusinessDto,
        updatedById,
      },
      include: {
        documents: { where: { deletedAt: null } },
      },
    });

    // Auto-recalculate risk if relevant fields changed
    if (needsRiskRecalc) {
      this.logger.log(`Auto-recalculating risk for business ${id} due to update`);
      await this.recalculateRisk(id);
    }

    this.logger.log(`Business updated successfully: ${id}`);
    return updated;
  }

  async changeStatus(
    id: string,
    dto: ChangeBusinessStatusDto,
    changedById: string,
  ) {
    this.logger.log(`Changing status for business ${id} to ${dto.status}`);
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) {
      this.logger.warn(`Business not found for status change: ${id}`);
      throw new NotFoundException(`Business with ID ${id} not found`);
    }

    // Prevent duplicate status
    if (business.status === dto.status) {
      this.logger.warn(
        `Attempted duplicate status change for business ${id}: already ${dto.status}`,
      );
      throw new BadRequestException(
        `Business is already in ${dto.status} status`,
      );
    }

    const updated = await this.prisma.business.update({
      where: { id },
      data: { status: dto.status },
    });

    // Create status history entry
    await this.prisma.statusHistory.create({
      data: {
        businessId: id,
        status: dto.status,
        changedById,
        reason: dto.reason || `Status changed to ${dto.status}`,
      },
    });

    // Mock notification (webhook/email)
    this.logger.log(
      `NOTIFICATION: Business ${business.name} status changed: ${business.status} -> ${dto.status}`,
    );
    // TODO: this.notificationsService.sendStatusChangeNotification(updated);

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
        changedBy: {
          select: { email: true, role: true },
        },
      },
    });

    this.logger.debug(`Retrieved ${history.length} status history entries`);

    return history;
  }

  async recalculateRisk(id: string) {
    this.logger.log(`Recalculating risk for business: ${id}`);

    const business = await this.prisma.business.findUnique({
      where: { id },
      include: {
        documents: { where: { deletedAt: null } },
      },
    });

    if (!business) {
      this.logger.warn(`Business not found for risk recalculation: ${id}`);
      throw new NotFoundException(`Business with ID ${id} not found`);
    }

    // Calculate new risk
    const riskCalculation = this.riskEngine.calculateRisk(
      business.country,
      business.industry,
      business.documents,
    );

    // Update business risk score
    const updated = await this.prisma.business.update({
      where: { id },
      data: { riskScore: riskCalculation.totalScore },
    });

    // Save calculation to history
    await this.prisma.riskCalculation.create({
      data: {
        businessId: id,
        totalScore: riskCalculation.totalScore,
        countryRisk: riskCalculation.countryRisk,
        industryRisk: riskCalculation.industryRisk,
        documentRisk: riskCalculation.documentRisk,
        metadata: riskCalculation.metadata,
      },
    });

    this.logger.log(
      `Risk recalculated for ${business.name}: ${business.riskScore} -> ${riskCalculation.totalScore}`,
    );

    return {
      ...updated,
      previousScore: business.riskScore,
      newScore: riskCalculation.totalScore,
      breakdown: riskCalculation,
    };
  }
}