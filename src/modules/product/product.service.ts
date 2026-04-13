import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { ProductRepository } from '../../models/product/product.repository';
import { CategoryRepository } from '../../models/category/category.repository';
import { BrandRepository } from '../../models/brand/brand.repository';
import { ProductFactoryService } from './factory';
import { BrandService } from '../brand/brand.service';
import { CloudinaryService } from '../../config/cloudinary/cloudinary.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { GetProductsDto } from './dto/get-products.dto';

@Injectable()
export class ProductService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly brandRepository: BrandRepository,
    private readonly productFactoryService: ProductFactoryService,
    private readonly brandService: BrandService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

//CREATE PRODUCT  
  async createProduct(
    dto: CreateProductDto,
    user: any,
    files: Express.Multer.File[],
  ) {
    const category = await this.categoryRepository.getOne({
      _id: new Types.ObjectId(dto.category),
      isDeleted: false,
    });
    if (!category) throw new NotFoundException('Category not found');

    const brand = await this.brandRepository.getOne({
      _id: new Types.ObjectId(dto.brand),
      isDeleted: false,
    });
    if (!brand) throw new NotFoundException('Brand not found');

    // ─── CHANGED: createProduct أصبح async ───────────────────────
    const product = await this.productFactoryService.createProduct(dto, user, files);

    await this.checkSlugConflict(product.slug);

    const created = await this.productRepository.create({ ...product } as any);

    await this.brandService.updateBrandStats(dto.brand, {
      totalProducts: (brand as any).stats.totalProducts + 1,
    });

    // ─── CHANGED: شيلنا baseUrl من mapProduct ────────────────────
    return this.productFactoryService.mapProduct(created);
  }

  // ─── Find All ─────────────────────────────────────────────────
  
  async findAll(query: GetProductsDto) {
    const {
      page = 1, limit = 10, search,
      category, brand, minPrice, maxPrice,
      inStock, onSale, isActive,
    } = query;

    const skip = (page - 1) * limit;
    const filter: Record<string, any> = { isDeleted: false };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) filter.category = new Types.ObjectId(category);
    if (brand) filter.brand = new Types.ObjectId(brand);
    if (isActive !== undefined) filter.isActive = isActive;

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = minPrice;
      if (maxPrice !== undefined) filter.price.$lte = maxPrice;
    }

    if (inStock === true) filter.stock = { $gt: 0 };
    if (inStock === false) filter.stock = 0;

    if (onSale === true) {
      filter.discountPrice = { $ne: null, $exists: true };
      filter.$expr = { $lt: ['$discountPrice', '$price'] };
    }

    const [products, total] = await Promise.all([
      this.productRepository.findWithPagination(filter, { skip, limit }),
      this.productRepository.countDocuments(filter),
    ]);

    // ─── CHANGED: شيلنا baseUrl من mapProduct ────────────────────
    const data = products.map((p) => this.productFactoryService.mapProduct(p));

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Find One ─────────────────────────────────────────────────
  
  async findOne(id: string) {
    const product = await this.productRepository.findOnePopulated({
      _id: new Types.ObjectId(id),
      isDeleted: false,
    });
    if (!product) throw new NotFoundException('Product not found');

    // ─── CHANGED: شيلنا baseUrl من mapProduct ────────────────────
    return this.productFactoryService.mapProduct(product);
  }

  // ─── Update Product ───────────────────────────────────────────
  
  async updateProduct(
    id: string,
    dto: UpdateProductDto,
    user: any,
    files: Express.Multer.File[],
  ) {
    if (dto.category) {
      const category = await this.categoryRepository.getOne({
        _id: new Types.ObjectId(dto.category),
        isDeleted: false,
      });
      if (!category) throw new NotFoundException('Category not found');
    }

    if (dto.brand) {
      const brand = await this.brandRepository.getOne({
        _id: new Types.ObjectId(dto.brand),
        isDeleted: false,
      });
      if (!brand) throw new NotFoundException('Brand not found');
    }

    const updates = await this.productFactoryService.updateProduct(id, dto, user, files);

    if (updates.slug) {
      await this.checkSlugConflict(updates.slug, id);
    }

    const updated = await this.productRepository.updateOne(
      { _id: new Types.ObjectId(id), isDeleted: false },
      updates,
      { new: true },
    );
    if (!updated) throw new NotFoundException('Product not found');

    // ─── CHANGED: شيلنا baseUrl من mapProduct ────────────────────
    return this.productFactoryService.mapProduct(updated);
  }

  // ─── Delete Product (Soft) ────────────────────────────────────
  async deleteProduct(id: string, user: any) {
    const product = await this.productRepository.getOne({
      _id: new Types.ObjectId(id),
      isDeleted: false,
    });
    if (!product) throw new NotFoundException('Product not found');

    // ─── CHANGED: حذف كل صور المنتج من Cloudinary ─────────────────
    const images = (product as any).images ?? [];
    const publicIds = images.map((img: any) => img.publicId).filter(Boolean);
    if (publicIds.length) {
      await this.cloudinaryService.deleteImages(publicIds);
    }

    await this.productRepository.updateOne(
      { _id: new Types.ObjectId(id) },
      { isDeleted: true, deletedBy: user._id, deletedAt: new Date() },
      { new: true },
    );

    const brand = await this.brandRepository.getOne({
      _id: (product as any).brand,
    });
    if (brand) {
      const current = (brand as any).stats?.totalProducts ?? 0;
      await this.brandService.updateBrandStats(
        (product as any).brand.toString(),
        { totalProducts: Math.max(0, current - 1) },
      );
    }
  }

  // ─── Activate ─────────────────────────────────────────────────
  
  async activateProduct(id: string, user: any) {
    const product = await this.productRepository.getOne({
      _id: new Types.ObjectId(id),
      isDeleted: false,
    });
    if (!product) throw new NotFoundException('Product not found');
    if ((product as any).isActive)
      throw new BadRequestException('Product is already active');

    const updated = await this.productRepository.updateOne(
      { _id: new Types.ObjectId(id) },
      { isActive: true, updatedBy: user._id },
      { new: true },
    );
    return this.productFactoryService.mapProduct(updated);
  }

  // ─── Deactivate ───────────────────────────────────────────────
  
  async deactivateProduct(id: string, user: any) {
    const product = await this.productRepository.getOne({
      _id: new Types.ObjectId(id),
      isDeleted: false,
    });
    if (!product) throw new NotFoundException('Product not found');
    if (!(product as any).isActive)
      throw new BadRequestException('Product is already inactive');

    const updated = await this.productRepository.updateOne(
      { _id: new Types.ObjectId(id) },
      { isActive: false, updatedBy: user._id },
      { new: true },
    );
    return this.productFactoryService.mapProduct(updated);
  }

  // ─── Update Product Stats ─────────────────────────────────────
  async updateProductStats(
    productId: string,
    stats: { averageRating?: number; totalReviews?: number },
  ) {
    const product = await this.productRepository.getOne({
      _id: new Types.ObjectId(productId),
      isDeleted: false,
    });
    if (!product) throw new NotFoundException('Product not found');

    const updatePayload: Record<string, any> = {};
    if (stats.averageRating !== undefined)
      updatePayload['stats.averageRating'] = stats.averageRating;
    if (stats.totalReviews !== undefined)
      updatePayload['stats.totalReviews'] = stats.totalReviews;

    return this.productRepository.updateOne(
      { _id: new Types.ObjectId(productId) },
      updatePayload,
      { new: true },
    );
  }

  // ─── Private Helpers ──────────────────────────────────────────
  private async checkSlugConflict(slug: string, excludeId?: string) {
    const filter: Record<string, any> = { slug, isDeleted: false };
    if (excludeId) filter._id = { $ne: new Types.ObjectId(excludeId) };
    const exists = await this.productRepository.getOne(filter);
    if (exists) throw new ConflictException('Product name already exists');
  }
}