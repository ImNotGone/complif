import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { BusinessesService } from './businesses.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { AdminOnly } from 'src/auth/admin.decorator';
import { AuthenticatedOnly } from 'src/auth/auth.decorator';

@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @AuthenticatedOnly()
  @Post()
  create(@Body() createBusinessDto: CreateBusinessDto) {
    return this.businessesService.create(createBusinessDto);
  }

  @AuthenticatedOnly()
  @Get()
  findAll() {
    return this.businessesService.findAll();
  }

  @AuthenticatedOnly()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.businessesService.findOne(id);
  }

  @AdminOnly()
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBusinessDto: UpdateBusinessDto) {
    return this.businessesService.update(id, updateBusinessDto);
  }

  @AdminOnly()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.businessesService.remove(id);
  }
}
