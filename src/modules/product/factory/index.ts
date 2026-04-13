import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import slugify from 'slugify';
import { Types } from 'mongoose';
import { Product, MappedProduct } from '../entities/product.entity';
import { CreateProductDto, DimensionsDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { ProductRepository } from '../../../models/product/product.repository';
import { CloudinaryService } from '../../../config/cloudinary/cloudinary.service';

const PRODUCT_IMAGES_FOLDER = 'products/images';

@Injectable()
export class ProductFactoryService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private buildSlug(name: string): string {
    return slugify(name, { lower: true, trim: true, replacement: '-' });
  }

  private generateSKU(name: string): string {
    const prefix = name.slice(0, 3).toUpperCase().replace(/\s/g, '');
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `${prefix}-${random}`;
  }

  // ─── FIXED: helper يحول DimensionsDto → required object ──────────
  private buildDimensions(
    d: DimensionsDto,
  ): { length: number; width: number; height: number } {
    return { length: d.length, width: d.width, height: d.height };
  }

  // ─── Create Product ───────────────────────────────────────────
  async createProduct(
    dto: CreateProductDto,
    user: any,
    files: Express.Multer.File[],
  ): Promise<Product> {
    if (dto.discountPrice !== undefined && dto.discountPrice >= dto.price) {
      throw new BadRequestException('Discount price must be less than original price');
    }

    const uploadedImages = await this.cloudinaryService.uploadImages(
      files,
      PRODUCT_IMAGES_FOLDER,
    );

    const product = new Product();
    (product as any)._id = new Types.ObjectId();
    product.name = dto.name;
    product.slug = this.buildSlug(dto.name);
    product.sku = this.generateSKU(dto.name);
    product.description = dto.description ?? null;
    product.price = dto.price;
    product.discountPrice = dto.discountPrice ?? null;
    product.stock = dto.stock;
    product.images = uploadedImages;
    product.tags = dto.tags ?? [];
    product.weight = dto.weight ?? null;
    // ─── FIXED: استخدمنا buildDimensions عشان نضمن إن الـ types صح ─
    product.dimensions = dto.dimensions ? this.buildDimensions(dto.dimensions) : null;
    product.category = new Types.ObjectId(dto.category);
    product.brand = new Types.ObjectId(dto.brand);
    product.isActive = true;
    product.isDeleted = false;
    product.createdBy = user._id;
    product.updatedBy = user._id;
    product.stats = { averageRating: 0, totalReviews: 0 };
    return product;
  }

  // ─── Update Product ───────────────────────────────────────────
  async updateProduct(
    id: string,
    dto: UpdateProductDto,
    user: any,
    files?: Express.Multer.File[],
  ): Promise<Partial<Product>> {
    const oldProduct = await this.productRepository.getOne({
      _id: new Types.ObjectId(id),
      isDeleted: false,
    });
    if (!oldProduct) throw new NotFoundException('Product not found');

    const effectivePrice = dto.price ?? (oldProduct as any).price;
    if (dto.discountPrice !== undefined && dto.discountPrice >= effectivePrice) {
      throw new BadRequestException('Discount price must be less than original price');
    }

    const updates: Partial<Product> = {};

    if (dto.name) {
      updates.name = dto.name;
      updates.slug = this.buildSlug(dto.name);
    }
    if (dto.description !== undefined) updates.description = dto.description ?? null;
    if (dto.price !== undefined) updates.price = dto.price;
    if (dto.discountPrice !== undefined) updates.discountPrice = dto.discountPrice ?? null;
    if (dto.stock !== undefined) updates.stock = dto.stock;
    if (dto.tags !== undefined) updates.tags = dto.tags;
    if (dto.weight !== undefined) updates.weight = dto.weight ?? null;
    // ─── FIXED: استخدمنا buildDimensions هنا برضو ────────────────
    if (dto.dimensions !== undefined) {
      updates.dimensions = dto.dimensions ? this.buildDimensions(dto.dimensions) : null;
    }
    if (dto.category !== undefined) updates.category = new Types.ObjectId(dto.category);
    if (dto.brand !== undefined) updates.brand = new Types.ObjectId(dto.brand);

    if (files?.length) {
      const oldImages = (oldProduct as any).images ?? [];
      const oldPublicIds = oldImages.map((img: any) => img.publicId).filter(Boolean);
      if (oldPublicIds.length) {
        await this.cloudinaryService.deleteImages(oldPublicIds);
      }
      updates.images = await this.cloudinaryService.uploadImages(files, PRODUCT_IMAGES_FOLDER);
    }

    updates.updatedBy = user._id;
    return updates;
  }

  // ─── Map Product ──────────────────────────────────────────────
  mapProduct(product: any): MappedProduct {
    const price = product.price ?? 0;
    const discountPrice = product.discountPrice ?? null;

    const isOnSale = discountPrice !== null && discountPrice < price;
    const finalPrice = isOnSale ? discountPrice : price;
    const discountPercentage = isOnSale
      ? Math.round(((price - discountPrice) / price) * 100)
      : 0;

    const images = (product.images ?? []).map(
      (img: { url: string; publicId: string }) => img.url,
    );

    return {
      id: product._id?.toString(),
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      description: product.description,
      price,
      discountPrice,
      finalPrice,
      isOnSale,
      discountPercentage,
      stock: product.stock,
      isOutOfStock: product.stock === 0,
      images,
      mainImage: images.length > 0 ? images[0] : null,
      tags: product.tags ?? [],
      weight: product.weight ?? null,
      dimensions: product.dimensions ?? null,
      category: product.category,
      brand: product.brand,
      isActive: product.isActive,
      stats: product.stats ?? { averageRating: 0, totalReviews: 0 },
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}