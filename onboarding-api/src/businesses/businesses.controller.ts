import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiParam,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { BusinessesService } from './businesses.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { AdminOnly } from 'src/auth/admin.decorator';
import { AuthenticatedOnly } from 'src/auth/auth.decorator';
import { ChangeBusinessStatusDto } from './dto/change-buisiness-status.dto';
import { StatusHistoryResponseDto } from './dto/status-history-response.dto';

@ApiTags('Businesses')
@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @AuthenticatedOnly()
  @Post()
  @ApiOperation({ summary: 'Create a business (authenticated users)' })
  @ApiCreatedResponse({ description: 'Business created successfully' })
  create(@Body() createBusinessDto: CreateBusinessDto) {
    return this.businessesService.create(createBusinessDto);
  }

  @AuthenticatedOnly()
  @Get()
  @ApiOperation({ summary: 'List all businesses' })
  @ApiOkResponse({ description: 'List of businesses' })
  findAll() {
    return this.businessesService.findAll();
  }

  @AuthenticatedOnly()
  @Get(':id')
  @ApiOperation({ summary: 'Get a business by ID' })
  @ApiParam({ name: 'id', example: 'clwxyz123' })
  @ApiOkResponse({ description: 'Business found' })
  findOne(@Param('id') id: string) {
    return this.businessesService.findOne(id);
  }

  @AdminOnly()
  @Patch(':id')
  @ApiOperation({ summary: 'Update a business (ADMIN only)' })
  @ApiParam({ name: 'id', example: 'clwxyz123' })
  update(
    @Param('id') id: string,
    @Body() updateBusinessDto: UpdateBusinessDto,
  ) {
    return this.businessesService.update(id, updateBusinessDto);
  }

  @AdminOnly()
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a business (ADMIN only)' })
  @ApiParam({ name: 'id', example: 'clwxyz123' })
  remove(@Param('id') id: string) {
    return this.businessesService.remove(id);
  }

  @AdminOnly()
  @Patch(':id/status')
  @ApiOperation({ summary: 'Change business status (ADMIN only)' })
  @ApiParam({ name: 'id', example: 'clwxyz123' })
  @ApiOkResponse({ description: 'Status updated successfully' })
  @ApiBadRequestResponse({ description: 'Invalid status transition' })
  changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeBusinessStatusDto,
  ) {
    return this.businessesService.changeStatus(id, dto);
  }

  @AuthenticatedOnly()
  @Get(':id/status-history')
  @ApiOperation({
    summary: 'Get status history timeline for a business',
  })
  @ApiParam({
    name: 'id',
    example: 'clwxyz123',
  })
  @ApiOkResponse({
    description: 'Status history retrieved successfully',
    type: StatusHistoryResponseDto,
    isArray: true,
  })
  @ApiNotFoundResponse({
    description: 'Business not found',
  })
  getStatusHistory(@Param('id') id: string) {
    return this.businessesService.getStatusHistory(id);
  }

}
