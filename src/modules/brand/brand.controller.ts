import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BrandService } from './brand.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { GetBrandsDto } from './dto/get-brand.dto';
import { RequestBrandDto } from './dto/request-brand.dto';
import { RejectBrandDto } from './dto/reject-brand.dto';
import { Auth } from '@common/decorators';
import { AuthGuard } from '@common/guards';
import { User } from '@common/decorators/user.decorator';
import { multerMemoryConfig } from '../../config/cloudinary/multer-memory.config';

@Controller('brand')
@UseGuards(AuthGuard)
export class BrandController {
  constructor(private readonly brandService: BrandService) { }

  // ─── admin Only ────────────────────────────────────────────────

  @Post()
  @Auth(['admin'])
  @UseInterceptors(FileInterceptor('logo', multerMemoryConfig))
  async createBrand(
    @Body() dto: CreateBrandDto,
    @User() user: any,
    @UploadedFile() logoFile?: Express.Multer.File,
  ) {
    const data = await this.brandService.createBrand(dto, user, logoFile);
    return { success: true, message: 'Brand created successfully', data };
  }

  @Put(':id')
  @Auth(['admin'])
  @UseInterceptors(FileInterceptor('logo', multerMemoryConfig))
  async updateBrand(
    @Param('id') id: string,
    @Body() dto: UpdateBrandDto,
    @User() user: any,
    @UploadedFile() logoFile?: Express.Multer.File,
  ) {
    const data = await this.brandService.updateBrand(id, dto, user, logoFile);
    return { success: true, message: 'Brand updated successfully', data };
  }

  @Delete(':id')
  @Auth(['admin'])
  async deleteBrand(@Param('id') id: string, @User() user: any) {
    await this.brandService.deleteBrand(id, user);
    return { success: true, message: 'Brand deleted successfully' };
  }

  @Patch(':id/activate')
  @Auth(['admin'])
  async activateBrand(@Param('id') id: string, @User() user: any) {
    const data = await this.brandService.activateBrand(id, user);
    return { success: true, message: 'Brand activated successfully', data };
  }

  @Patch(':id/deactivate')
  @Auth(['admin'])
  async deactivateBrand(@Param('id') id: string, @User() user: any) {
    const data = await this.brandService.deactivateBrand(id, user);
    return { success: true, message: 'Brand deactivated successfully', data };
  }

  @Get('requests')
  @Auth(['admin'])
  async findAllRequests(@Query() query: GetBrandsDto) {
    const result = await this.brandService.findAllRequests(query);
    return {
      success: true,
      message: 'Brand requests fetched successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  @Patch('requests/:requestId/approve')
  @Auth(['admin'])
  async approveBrand(
    @Param('requestId') requestId: string,
    @User() user: any,
  ) {
    const data = await this.brandService.approveBrand(requestId, user);
    return {
      success: true,
      message: 'Brand request approved and brand created successfully',
      data,
    };
  }

  @Patch('requests/:requestId/reject')
  @Auth(['admin'])
  async rejectBrand(
    @Param('requestId') requestId: string,
    @Body() dto: RejectBrandDto,
    @User() user: any,
  ) {
    const data = await this.brandService.rejectBrand(requestId, dto, user);
    return {
      success: true,
      message: 'Brand request rejected successfully',
      data,
    };
  }

  // ─── Static routes (must come before :id) ─────────────────────

  @Get('by-category/:categoryId')
  @Auth(['admin', 'customer', 'seller'])
  async findByCategory(
    @Param('categoryId') categoryId: string,
    @Query() query: GetBrandsDto,
  ) {
    const result = await this.brandService.findByCategory(categoryId, query);
    return {
      success: true,
      message: 'Brands fetched successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  // ─── admin + customer + seller ─────────────────────────────────

  @Get()
  @Auth(['admin', 'customer', 'seller'])
  async findAll(@Query() query: GetBrandsDto) {
    const result = await this.brandService.findAll(query);
    return {
      success: true,
      message: 'Brands fetched successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(':id')
  @Auth(['admin', 'customer', 'seller'])
  async findOne(@Param('id') id: string) {
    const data = await this.brandService.findOne(id);
    return { success: true, message: 'Brand fetched successfully', data };
  }

  // ─── seller + customer ─────────────────────────────────────────

  @Post('request')
  @Auth(['seller', 'customer'])
  @UseInterceptors(FileInterceptor('logo', multerMemoryConfig))
  async requestBrand(
    @Body() dto: RequestBrandDto,
    @User() user: any,
    @UploadedFile() logoFile?: Express.Multer.File,
  ) {
    const data = await this.brandService.requestBrand(dto, user, logoFile);
    return {
      success: true,
      message: 'Brand request submitted successfully',
      data,
    };
  }
}