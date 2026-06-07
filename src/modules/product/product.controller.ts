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
import { Public } from '@common/decorators/public.decorator';

@Controller('product')
@UseGuards(AuthGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) { }

  // ─── Admin + Seller ────────────────────────────────────────────

  @Post()
  @Auth(['Admin', 'Seller'])
  @UseInterceptors(FilesInterceptor('images', 10, multerMemoryConfig))
  async createProduct(
    @Body() dto: CreateProductDto,
    @User() user: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const data = await this.productService.createProduct(dto, user, files ?? []);
    return { success: true, message: 'Product created successfully', data };
  }

  @Put(':id')
  @Auth(['Admin', 'Seller'])
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

  // ─── Admin Only ────────────────────────────────────────────────

  @Delete(':id')
  @Auth(['Admin'])
  async deleteProduct(@Param('id') id: string, @User() user: any) {
    await this.productService.deleteProduct(id, user);
    return { success: true, message: 'Product deleted successfully' };
  }

  @Patch(':id/activate')
  @Auth(['Admin'])
  async activateProduct(@Param('id') id: string, @User() user: any) {
    const data = await this.productService.activateProduct(id, user);
    return { success: true, message: 'Product activated successfully', data };
  }

  @Patch(':id/deactivate')
  @Auth(['Admin'])
  async deactivateProduct(@Param('id') id: string, @User() user: any) {
    const data = await this.productService.deactivateProduct(id, user);
    return { success: true, message: 'Product deactivated successfully', data };
  }

  // ─── Public feeds (must come before :id) ──────────────────────

  @Get('new-arrivals')
  @Public()
  async getNewArrivals(@Query('limit') limit = 20) {
    return this.productService.getNewArrivals(+limit);
  }

  @Get('top-rated')
  @Public()
  async getTopRated(@Query('limit') limit = 20) {
    return this.productService.getTopRated(+limit);
  }

  @Get('trending')
  @Public()
  async getTrending(@Query('limit') limit = 20) {
    return this.productService.getTrending(+limit);
  }

  // ─── Static routes (must come before :id) ─────────────────────

  @Get('by-category/:categoryId')
  @Auth(['Admin', 'Seller', 'Customer'])
  async findByCategory(
    @Param('categoryId') categoryId: string,
    @Query() query: GetProductsDto,
  ) {
    const result = await this.productService.findAll({ ...query, category: categoryId });
    return {
      success: true,
      message: 'Products fetched successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  @Get('by-brand/:brandId')
  @Auth(['Admin', 'Seller', 'Customer'])
  async findByBrand(
    @Param('brandId') brandId: string,
    @Query() query: GetProductsDto,
  ) {
    const result = await this.productService.findAll({ ...query, brand: brandId });
    return {
      success: true,
      message: 'Products fetched successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  // ─── All Roles ─────────────────────────────────────────────────

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
  // ─── AI Endpoints ─────────────────────────────────────────────

@Post('recommendations')
async getRecommendations(@Body('categories') categories: string[]) {
  return this.productService.getAiRecommendations(categories);
}

@Get('similar/:id')
async getSimilar(@Param('id') id: string) {
  return this.productService.getSimilarProducts(id);
}

@Get('ai-trending')
async getAiTrending(@Query('category') category?: string) {
  return this.productService.getAiTrending(category);
}

@Post('behavioral/recommend')
async behavioralRecommend(@Body() body: any) {
  return this.productService.getBehavioralRecommendations(body);
}

@Post('behavioral/track')
async trackEvent(@Body() body: any) {
  return this.productService.trackUserEvent(body);
}

@Post('cart/cross-sell')
async cartCrossSell(@Body() body: { cart_product_ids: string[]; top_n?: number }) {
  return this.productService.getCartCrossSell(body.cart_product_ids, body.top_n);
}

  @Get(':id')
  @Auth(['Admin', 'Seller', 'Customer'])
  async findOne(@Param('id') id: string) {
    // ─── Track view silently ──────────────────────────────────
    this.productService.trackView(id).catch(() => null);
    const data = await this.productService.findOne(id);
    return { success: true, message: 'Product fetched successfully', data };
  }
}