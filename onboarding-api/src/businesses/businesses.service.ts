import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { RiskEngineService } from './risk-engine.service';
import { PrismaService } from 'src/prisma.service';
import { ChangeBusinessStatusDto } from './dto/change-buisiness-status.dto';

@Injectable()
export class BusinessesService {

  private readonly logger = new Logger(BusinessesService.name);

  constructor(
    private prisma: PrismaService,
    private riskEngine: RiskEngineService,
  ) { }

  async create(createBusinessDto: CreateBusinessDto) {
    // 1. Validar Tax ID con microservicio externo (Mock)
    await this.validateTaxIdExternal(createBusinessDto.taxId);

    // 2. Calcular Riesgo
    const riskScore = this.riskEngine.calculate(
      createBusinessDto.country,
      createBusinessDto.industry,
    );

    // 3. Determinar Estado Inicial
    const initialStatus = this.riskEngine.determineInitialStatus(riskScore);

    // 4. Guardar en Base de Datos
    const newBusiness = await this.prisma.business.create({
      data: {
        ...createBusinessDto,
        riskScore,
        status: initialStatus,
        statusHistory: {
          create: {
            status: initialStatus,
            reason: `Initial creation. Risk Score: ${riskScore}`,
          }
        }
      },
    });

    // 5. Notificación (Log Mock)
    this.logger.log(`Business created: ${newBusiness.name} [Score: ${riskScore}]`);

    return newBusiness;
  }

  private async validateTaxIdExternal(taxId: string): Promise<boolean> {
    try {
      // TODO: await firstValueFrom(this.httpService.get(`http://validator-service:3001/validate/${taxId}`));
      this.logger.debug(`Validating Tax ID ${taxId} externally...`);
      return true;
    } catch (error) {
      throw new Error('Tax ID Validation failed');
    }
  }

  findAll() {
    return this.prisma.business.findMany();
  }

  findOne(id: string) {
    return this.prisma.business.findUnique({
      where: { id },
    });
  }

  update(id: string, updateBusinessDto: UpdateBusinessDto) {
    return this.prisma.business.update({
      where: { id },
      data: updateBusinessDto,
    });
  }

  remove(id: string) {
    return this.prisma.business.delete({
      where: { id },
    });
  }

  async changeStatus(id: string, dto: ChangeBusinessStatusDto) {
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundException();

    const updated = await this.prisma.business.update({
      where: { id },
      data: { status: dto.status },
    });

    await this.prisma.statusHistory.create({
      data: {
        businessId: id,
        status: dto.status,
        reason: dto.reason,
      },
    });

    // TODO (WEBHOOK): this.notificationsService.businessStatusChanged(updated);

    return updated;
  }

  async getStatusHistory(businessId: string) {
    const businessExists = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });

    if (!businessExists) {
      throw new NotFoundException('Business not found');
    }

    return this.prisma.statusHistory.findMany({
      where: { businessId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
