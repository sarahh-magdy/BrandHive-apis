import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';

import { BrandController } from './brand.controller';
import { BrandService } from './brand.service';
import { BrandFactoryService } from './factory';
import { BrandRepository } from '../../models/brand/brand.repository';
import { BrandRequestRepository } from '../../models/brand-request/brand-request.repository';
import { Brand, BrandSchema } from '../../models/brand/brand.schema';
import { BrandRequest, BrandRequestSchema } from '../../models/brand-request/brand-request.schema';
import { UserMongoModule } from '../../shared/modules/user-mongo.module';
// ─── CHANGED: أضفنا CloudinaryModule ──────────────────────────────
import { CloudinaryModule } from '../../config/cloudinary/cloudinary.module';

@Module({
  imports: [
    UserMongoModule,
    JwtModule,
    // ─── CHANGED: أضفنا CloudinaryModule ────────────────────────
    CloudinaryModule,
    MongooseModule.forFeature([
      { name: Brand.name, schema: BrandSchema },
      { name: BrandRequest.name, schema: BrandRequestSchema },
    ]),
  ],
  controllers: [BrandController],
  providers: [
    BrandService,
    BrandFactoryService,
    BrandRepository,
    BrandRequestRepository,
  ],
  exports: [BrandService],
})
export class BrandModule {}