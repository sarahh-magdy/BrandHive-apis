import { Injectable, NotFoundException } from '@nestjs/common';
import slugify from 'slugify';
import { Types } from 'mongoose';
// ─── FIXED: import BrandRequestStatus من نفس الـ entity ───────────
import { Brand } from '../entities/brand.entity';
import { BrandRequest , BrandRequestStatus } from '../entities/brand-reruest.entity';
import { CreateBrandDto } from '../dto/create-brand.dto';
import { UpdateBrandDto } from '../dto/update-brand.dto';
import { RequestBrandDto } from '../dto/request-brand.dto';
import { BrandRepository } from '../../../models/brand/brand.repository';
import { CloudinaryService } from '../../../config/cloudinary/cloudinary.service';

const BRAND_LOGO_FOLDER = 'brands/logos';

@Injectable()
export class BrandFactoryService {
  constructor(
    private readonly brandRepository: BrandRepository,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private buildSlug(name: string): string {
    return slugify(name, { lower: true, trim: true, replacement: '-' });
  }

  private toObjectIdArray(ids: string[] = []): Types.ObjectId[] {
    return ids.map((id) => new Types.ObjectId(id));
  }

  // ─── Create Brand ─────────────────────────────────────────────
  async createBrand(
    dto: CreateBrandDto,
    user: any,
    logoFile?: Express.Multer.File,
  ): Promise<Brand> {
    const brand = new Brand();
    (brand as any)._id = new Types.ObjectId();
    brand.name = dto.name;
    brand.slug = this.buildSlug(dto.name);
    brand.description = dto.description ?? null;
    brand.country = dto.country ?? null;
    brand.website = dto.website ?? null;
    brand.categories = this.toObjectIdArray(dto.categories);
    brand.isActive = true;
    brand.isDeleted = false;
    brand.createdBy = user._id;
    brand.updatedBy = user._id;
    brand.stats = { totalProducts: 0, averageRating: 0, totalReviews: 0, totalSales: 0 };

    if (logoFile) {
      const uploaded = await this.cloudinaryService.uploadImage(logoFile, BRAND_LOGO_FOLDER);
      brand.logo = { url: uploaded.url, publicId: uploaded.publicId };
    } else {
      brand.logo = null;
    }

    return brand;
  }

  // ─── Update Brand ─────────────────────────────────────────────
  async updateBrand(
    id: string,
    dto: UpdateBrandDto,
    user: any,
    logoFile?: Express.Multer.File,
  ): Promise<Partial<Brand>> {
    const oldBrand = (await this.brandRepository.getOne({
      _id: new Types.ObjectId(id),
      isDeleted: false,
    })) as Brand;

    if (!oldBrand) throw new NotFoundException('Brand not found');

    const updates: Partial<Brand> = {};

    if (dto.name) {
      updates.name = dto.name;
      updates.slug = this.buildSlug(dto.name);
    }
    if (dto.description !== undefined) updates.description = dto.description ?? null;
    if (dto.country !== undefined) updates.country = dto.country ?? null;
    if (dto.website !== undefined) updates.website = dto.website ?? null;
    if (dto.categories !== undefined) updates.categories = this.toObjectIdArray(dto.categories);

    if (logoFile) {
      if (oldBrand.logo?.publicId) {
        await this.cloudinaryService.deleteImage(oldBrand.logo.publicId);
      }
      const uploaded = await this.cloudinaryService.uploadImage(logoFile, BRAND_LOGO_FOLDER);
      updates.logo = { url: uploaded.url, publicId: uploaded.publicId };
    }

    updates.updatedBy = user._id;
    return updates;
  }

  // ─── Create Brand Request ─────────────────────────────────────
  // ─── FIXED: return type بقى BrandRequest بدل Partial<BrandRequest>
  // السبب: Partial بيخلي كل field optional وده بيـ conflict مع null values
  async createBrandRequest(
    dto: RequestBrandDto,
    user: any,
    logoFile?: Express.Multer.File,
  ): Promise<BrandRequest> {
    let logo: { url: string; publicId: string } | null = null;
    if (logoFile) {
      const uploaded = await this.cloudinaryService.uploadImage(logoFile, BRAND_LOGO_FOLDER);
      logo = { url: uploaded.url, publicId: uploaded.publicId };
    }

    const request = new BrandRequest();
    (request as any)._id = new Types.ObjectId();
    request.name = dto.name;
    // ─── FIXED: null بدل ?? null عشان TypeScript يعرف النوع ────────
    request.description = dto.description ?? null;
    request.country = dto.country ?? null;
    request.website = dto.website ?? null;
    request.logo = logo;
    request.categories = this.toObjectIdArray(dto.categories);
    request.requestedBy = user._id;
    request.status = BrandRequestStatus.PENDING;
    request.rejectionReason = null;
    request.reviewedBy = null;
    request.reviewedAt = null;

    return request;
  }

  // ─── Build Brand from Approved Request ────────────────────────
  buildBrandFromRequest(request: BrandRequest, adminUser: any): Brand {
    const brand = new Brand();
    (brand as any)._id = new Types.ObjectId();
    brand.name = request.name;
    brand.slug = this.buildSlug(request.name);
    brand.description = request.description ?? null;
    brand.country = request.country ?? null;
    brand.website = request.website ?? null;
    brand.logo = request.logo ?? null;
    brand.categories = request.categories ?? [];
    brand.isActive = true;
    brand.isDeleted = false;
    brand.createdBy = adminUser._id;
    brand.updatedBy = adminUser._id;
    brand.stats = { totalProducts: 0, averageRating: 0, totalReviews: 0, totalSales: 0 };
    return brand;
  }
}