import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
// ─── CHANGED: شيلنا MulterModule ─────────────────────────────────
// السبب: Multer بيشتغل عن طريق memoryStorage مباشرة في الـ config

import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ProductFactoryService } from './factory';
import { ProductRepository } from '../../models/product/product.repository';
import { CategoryRepository } from '../../models/category/category.repository';
import { BrandRepository } from '../../models/brand/brand.repository';
import { Product, ProductSchema } from '../../models/product/product.schema';
import { Category, CategorySchema } from '../../models/category/category.schema';
import { Brand, BrandSchema } from '../../models/brand/brand.schema';
import { BrandRequest, BrandRequestSchema } from '../../models/brand-request/brand-request.schema';
import { BrandRequestRepository } from '../../models/brand-request/brand-request.repository';
import { BrandService } from '../brand/brand.service';
import { BrandFactoryService } from '../brand/factory';
import { UserMongoModule } from '../../shared/modules/user-mongo.module';
// ─── CHANGED: أضفنا CloudinaryModule ──────────────────────────────
import { CloudinaryModule } from '../../config/cloudinary/cloudinary.module';

@Module({
  imports: [
    UserMongoModule,
    JwtModule,
    // ─── CHANGED: CloudinaryModule بدل MulterModule ───────────────
    CloudinaryModule,
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Brand.name, schema: BrandSchema },
      { name: BrandRequest.name, schema: BrandRequestSchema },
    ]),
  ],
  controllers: [ProductController],
  providers: [
    ProductService,
    ProductFactoryService,
    ProductRepository,
    CategoryRepository,
    BrandRepository,
    BrandRequestRepository,
    BrandService,
    BrandFactoryService,
  ],
  exports: [ProductService],
})
export class ProductModule {}