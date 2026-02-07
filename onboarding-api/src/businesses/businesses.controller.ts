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
import { AdminOnly } from 'src/auth/admin.decorator';
import { AuthenticatedOnly } from 'src/auth/auth.decorator';
import { ChangeBusinessStatusDto } from './dto/change-business-status.dto';
import { StatusHistoryResponseDto } from './dto/status-history-response.dto';
import { BusinessStatus } from '@prisma/client';
import { FindBusinessesQueryDto } from './dto/find-business-query.dto';

@ApiTags('Businesses')
@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @AuthenticatedOnly()
  @Post()
  @ApiOperation({ summary: 'Create a business and calculate initial risk score' })
  @ApiCreatedResponse({ description: 'Business created successfully' })
  @ApiBadRequestResponse({ description: 'Invalid input or tax ID validation failed' })
  create(@Body() createBusinessDto: CreateBusinessDto, @Req() req: any) {
    const userId = req.user.userId;
    return this.businessesService.create(createBusinessDto, userId);
  }

  @AuthenticatedOnly()
  @Get()
  @ApiOperation({ summary: 'List businesses with optional filters and pagination' })
  @ApiOkResponse({ description: 'List of businesses' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'status', required: false, enum: BusinessStatus })
  @ApiQuery({ name: 'country', required: false, example: 'AR' })
  @ApiQuery({ name: 'search', required: false, example: 'Acme Corp' })
  findAll( @Query() query: FindBusinessesQueryDto) {
    return this.businessesService.findAll(query);
  }

  @AuthenticatedOnly()
  @Get(':id')
  @ApiOperation({ summary: 'Get business details with documents and status history' })
  @ApiParam({ name: 'id', description: 'Business UUID' })
  @ApiOkResponse({ description: 'Business found' })
  @ApiNotFoundResponse({ description: 'Business not found' })
  findOne(@Param('id') id: string) {
    return this.businessesService.findOne(id);
  }

  @AdminOnly()
  @Patch(':id')
  @ApiOperation({ summary: 'Update business info (ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Business UUID' })
  @ApiOkResponse({ description: 'Business updated successfully' })
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
  @ApiOkResponse({ description: 'Status updated successfully' })
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

  @AdminOnly()
  @Post(':id/risk/calculate')
  @ApiOperation({ summary: 'Manually recalculate risk score (ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Business UUID' })
  @ApiOkResponse({ description: 'Risk score recalculated' })
  @ApiNotFoundResponse({ description: 'Business not found' })
  recalculateRisk(@Param('id') id: string) {
    return this.businessesService.recalculateRisk(id);
  }
}