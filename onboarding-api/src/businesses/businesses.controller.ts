import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiParam,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { BusinessesService } from './businesses.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { AdminOnly } from '..//auth/decorators/admin.decorator';
import { AuthenticatedOnly } from '..//auth/decorators/auth.decorator';
import { ChangeBusinessStatusDto } from './dto/change-business-status.dto';
import { RecalculateRiskDto } from './dto/recalculate-risk.dto';
import { StatusHistoryResponseDto } from './dto/status-history-response.dto';
import { BusinessStatus } from '@prisma/client';
import { FindBusinessesQueryDto } from './dto/find-business-query.dto';
import { BusinessResponseDto } from './dto/business-response.dto';
import { PaginatedBusinessesResponseDto } from './dto/paginated-business-response.dto';
import { RecalculateRiskResponseDto } from './dto/recalculate-risk-response.dto';

@ApiTags('Businesses')
@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @AdminOnly()
  @Post()
  @ApiOperation({ summary: 'Create a business and calculate initial risk score' })
  @ApiCreatedResponse({
    description: 'Business created successfully',
    type: BusinessResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input or tax ID validation failed' })
  create(@Body() createBusinessDto: CreateBusinessDto, @Req() req: any) {
    const userId = req.user.userId;
    return this.businessesService.create(createBusinessDto, userId);
  }

  @AuthenticatedOnly()
  @Get()
  @ApiOperation({ summary: 'List businesses with optional filters and pagination' })
  @ApiOkResponse({
    description: 'List of businesses',
    type: PaginatedBusinessesResponseDto,
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'status', required: false, enum: BusinessStatus })
  @ApiQuery({ name: 'country', required: false, example: 'AR' })
  @ApiQuery({ name: 'search', required: false, example: 'Acme Corp' })
  findAll(@Query() query: FindBusinessesQueryDto) {
    return this.businessesService.findAll(query);
  }

  @AuthenticatedOnly()
  @Get(':id')
  @ApiOperation({ summary: 'Get basic business details' })
  @ApiParam({ name: 'id', description: 'Business UUID' })
  @ApiOkResponse({
    description: 'Business found',
    type: BusinessResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Business not found' })
  findOne(@Param('id') id: string) {
    return this.businessesService.findOne(id);
  }

  @AdminOnly()
  @Patch(':id')
  @ApiOperation({ summary: 'Update business info (ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Business UUID' })
  @ApiOkResponse({
    description: 'Business updated successfully',
    type: BusinessResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Business not found' })
  update(
    @Param('id') id: string,
    @Body() updateBusinessDto: UpdateBusinessDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.businessesService.update(id, updateBusinessDto, userId);
  }

  @AdminOnly()
  @Patch(':id/status')
  @ApiOperation({ summary: 'Change business status (ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Business UUID' })
  @ApiOkResponse({
    description: 'Status updated successfully',
    type: BusinessResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid status transition' })
  @ApiNotFoundResponse({ description: 'Business not found' })
  changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeBusinessStatusDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.businessesService.changeStatus(id, dto, userId);
  }

  @AuthenticatedOnly()
  @Get(':id/status-history')
  @ApiOperation({ summary: 'Get status history timeline for a business' })
  @ApiParam({ name: 'id', description: 'Business UUID' })
  @ApiOkResponse({
    description: 'Status history retrieved successfully',
    type: StatusHistoryResponseDto,
    isArray: true,
  })
  @ApiNotFoundResponse({ description: 'Business not found' })
  getStatusHistory(@Param('id') id: string) {
    return this.businessesService.getStatusHistory(id);
  }

  @AuthenticatedOnly()
  @Get(':id/risk-history')
  @ApiOperation({ summary: 'Get risk calculation history for a business' })
  @ApiParam({ name: 'id', description: 'Business UUID' })
  @ApiOkResponse({
    description: 'Risk history retrieved successfully',
    type: RecalculateRiskResponseDto,
    isArray: true
  })
  @ApiNotFoundResponse({ description: 'Business not found' })
  getRiskHistory(@Param('id') id: string) {
    return this.businessesService.getRiskHistory(id);
  }

  @AdminOnly()
  @Post(':id/risk/calculate')
  @ApiOperation({ summary: 'Manually recalculate risk score (ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Business UUID' })
  @ApiOkResponse({
    description: 'Risk score recalculated',
    type: RecalculateRiskResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Business not found' })
  recalculateRisk(
    @Param('id') id: string,
    @Body() dto: RecalculateRiskDto,
  ) {
    return this.businessesService.recalculateRisk(id, dto.reason);
  }
}