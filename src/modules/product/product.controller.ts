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
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { GetProductsDto } from './dto/get-products.dto';
import { multerMemoryConfig } from '../../config/cloudinary/multer-memory.config';
import { Auth } from '@common/decorators';
import { AuthGuard } from '@common/guards';
import { User } from '@common/decorators/user.decorator';

@Controller('product')
@UseGuards(AuthGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  // Admin + Seller
//CUSTOMER FOR TESTING PURPOSES

  @Post()
  @Auth(['Admin', 'Seller' , 'Customer'])
  @UseInterceptors(FilesInterceptor('images', 10, multerMemoryConfig))
  async createProduct(
    @Body() dto: CreateProductDto,
    @User() user: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const data = await this.productService.createProduct(dto, user, files ?? []);
    return { success: true, message: 'Product created successfully', data };
  }

  //CUSTOMER FOR TESTING PURPOSES

  @Put(':id')
  @Auth(['Admin', 'Seller' , 'Customer'])
  @UseInterceptors(FilesInterceptor('images', 10, multerMemoryConfig))
  async updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @User() user: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const data = await this.productService.updateProduct(id, dto, user, files ?? []);
    return { success: true, message: 'Product updated successfully', data };
  }

  //CUSTOMER FOR TESTING PURPOSES

  @Delete(':id')
  @Auth(['Admin', 'Customer'])
  async deleteProduct(@Param('id') id: string, @User() user: any) {
    await this.productService.deleteProduct(id, user);
    return { success: true, message: 'Product deleted successfully' };
  }

  //CUSTOMER FOR TESTING PURPOSES

  @Patch(':id/activate')
  @Auth(['Admin', 'Customer'])
  async activateProduct(@Param('id') id: string, @User() user: any) {
    const data = await this.productService.activateProduct(id, user);
    return { success: true, message: 'Product activated successfully', data };
  }

  //CUSTOMER FOR TESTING PURPOSES

  @Patch(':id/deactivate')
  @Auth(['Admin', 'Customer'])
  async deactivateProduct(@Param('id') id: string, @User() user: any) {
    const data = await this.productService.deactivateProduct(id, user);
    return { success: true, message: 'Product deactivated successfully', data };
  }

  // All Roles

  @Get()
  @Auth(['Admin', 'Seller', 'Customer'])
  async findAll(@Query() query: GetProductsDto) {
    const result = await this.productService.findAll(query);
    return {
      success: true,
      message: 'Products fetched successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(':id')
  @Auth(['Admin', 'Seller', 'Customer'])
  async findOne(@Param('id') id: string) {
    const data = await this.productService.findOne(id);
    return { success: true, message: 'Product fetched successfully', data };
  }
}