import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { BrandRepository } from '../../models/brand/brand.repository';
import { BrandRequestRepository } from '../../models/brand-request/brand-request.repository';
import { BrandFactoryService } from './factory';
// ─── FIXED: import BrandRequestStatus من الـ entity مش من مكان تاني
import { Brand } from './entities/brand.entity';
import { BrandRequestStatus } from './entities/brand-reruest.entity';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { GetBrandsDto } from './dto/get-brand.dto';
import { RequestBrandDto } from './dto/request-brand.dto';
import { RejectBrandDto } from './dto/reject-brand.dto';
import { UpdateBrandStatsDto } from './dto/update-brand-stats.dto';
import { CloudinaryService } from '../../config/cloudinary/cloudinary.service';

@Injectable()
export class BrandService {
  constructor(
    private readonly brandRepository: BrandRepository,
    private readonly brandRequestRepository: BrandRequestRepository,
    private readonly brandFactoryService: BrandFactoryService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // ─── Create Brand ─────────────────────────────────────────────
  async createBrand(dto: CreateBrandDto, user: any, logoFile?: Express.Multer.File) {
    const brand = await this.brandFactoryService.createBrand(dto, user, logoFile);
    await this.checkSlugConflict(brand.slug);
    return this.brandRepository.create({ ...brand } as any);
  }

  // ─── Find All ─────────────────────────────────────────────────
  async findAll(query: GetBrandsDto) {
    const { page = 1, limit = 10, search, category, isActive } = query;
    const skip = (page - 1) * limit;
    const filter: Record<string, any> = { isDeleted: false };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ];
    }
    if (category) filter.categories = new Types.ObjectId(category);
    if (isActive !== undefined) filter.isActive = isActive;

    const [data, total] = await Promise.all([
      this.brandRepository.findWithPagination(filter, { skip, limit }),
      this.brandRepository.countDocuments(filter),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ─── Find One ─────────────────────────────────────────────────
  async findOne(id: string) {
    const brand = await this.brandRepository.getOne({
      _id: new Types.ObjectId(id),
      isDeleted: false,
    });
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  // ─── Update Brand ─────────────────────────────────────────────
  async updateBrand(id: string, dto: UpdateBrandDto, user: any, logoFile?: Express.Multer.File) {
    const updates = await this.brandFactoryService.updateBrand(id, dto, user, logoFile);

    if (updates.slug) await this.checkSlugConflict(updates.slug, id);

    const updated = await this.brandRepository.updateOne(
      { _id: new Types.ObjectId(id), isDeleted: false },
      updates,
      { new: true },
    );
    if (!updated) throw new NotFoundException('Brand not found');
    return updated;
  }

  // ─── Delete Brand ─────────────────────────────────────────────
  async deleteBrand(id: string, user: any) {
    const brand = await this.brandRepository.getOne({ _id: new Types.ObjectId(id), isDeleted: false });
    if (!brand) throw new NotFoundException('Brand not found');

    if ((brand as any).logo?.publicId) {
      await this.cloudinaryService.deleteImage((brand as any).logo.publicId);
    }

    await this.brandRepository.updateOne(
      { _id: new Types.ObjectId(id) },
      { isDeleted: true, deletedBy: user._id, deletedAt: new Date() },
      { new: true },
    );
  }

  // ─── Activate ─────────────────────────────────────────────────
  async activateBrand(id: string, user: any) {
    const brand = await this.brandRepository.getOne({ _id: new Types.ObjectId(id), isDeleted: false });
    if (!brand) throw new NotFoundException('Brand not found');
    if ((brand as any).isActive) throw new BadRequestException('Brand is already active');

    return this.brandRepository.updateOne(
      { _id: new Types.ObjectId(id) },
      { isActive: true, updatedBy: user._id },
      { new: true },
    );
  }

  // ─── Deactivate ───────────────────────────────────────────────
  async deactivateBrand(id: string, user: any) {
    const brand = await this.brandRepository.getOne({ _id: new Types.ObjectId(id), isDeleted: false });
    if (!brand) throw new NotFoundException('Brand not found');
    if (!(brand as any).isActive) throw new BadRequestException('Brand is already inactive');

    return this.brandRepository.updateOne(
      { _id: new Types.ObjectId(id) },
      { isActive: false, updatedBy: user._id },
      { new: true },
    );
  }

  // ─── Request Brand ────────────────────────────────────────────
  async requestBrand(dto: RequestBrandDto, user: any, logoFile?: Express.Multer.File) {
    const slug = dto.name.toLowerCase().trim().replace(/\s+/g, '-');

    const existingBrand = await this.brandRepository.getOne({ slug, isDeleted: false });
    if (existingBrand) throw new ConflictException('Brand already exists');

    const pendingRequest = await this.brandRequestRepository.getOne({
      name: { $regex: new RegExp(`^${dto.name}$`, 'i') },
      // ─── FIXED: BrandRequestStatus بييجي من الـ entity ────────
      status: BrandRequestStatus.PENDING,
    });
    if (pendingRequest) throw new ConflictException('A pending request for this brand already exists');

    const request = await this.brandFactoryService.createBrandRequest(dto, user, logoFile);
    return this.brandRequestRepository.create({ ...request } as any);
  }

  // ─── Find All Requests ────────────────────────────────────────
  async findAllRequests(query: GetBrandsDto) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;
    const filter: Record<string, any> = {};
    if (search) filter.name = { $regex: search, $options: 'i' };

    const [data, total] = await Promise.all([
      this.brandRequestRepository.findWithPagination(filter, { skip, limit }),
      this.brandRequestRepository.countDocuments(filter),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ─── Approve Brand Request ────────────────────────────────────
  async approveBrand(requestId: string, user: any) {
    const request = await this.brandRequestRepository.getOne({
      _id: new Types.ObjectId(requestId),
      // ─── FIXED: BrandRequestStatus بييجي من الـ entity ────────
      status: BrandRequestStatus.PENDING,
    });
    if (!request) throw new NotFoundException('Pending brand request not found');

    const slug = (request as any).name.toLowerCase().trim().replace(/\s+/g, '-');
    await this.checkSlugConflict(slug);

    const brand = this.brandFactoryService.buildBrandFromRequest(request as any, user);
    const createdBrand = await this.brandRepository.create({ ...brand } as any);

    await this.brandRequestRepository.updateOne(
      { _id: new Types.ObjectId(requestId) },
      {
        // ─── FIXED: BrandRequestStatus بييجي من الـ entity ──────
        status: BrandRequestStatus.APPROVED,
        reviewedBy: user._id,
        reviewedAt: new Date(),
      },
      { new: true },
    );

    return createdBrand;
  }

  // ─── Reject Brand Request ─────────────────────────────────────
  async rejectBrand(requestId: string, dto: RejectBrandDto, user: any) {
    const request = await this.brandRequestRepository.getOne({
      _id: new Types.ObjectId(requestId),
      // ─── FIXED: BrandRequestStatus بييجي من الـ entity ────────
      status: BrandRequestStatus.PENDING,
    });
    if (!request) throw new NotFoundException('Pending brand request not found');

    if ((request as any).logo?.publicId) {
      await this.cloudinaryService.deleteImage((request as any).logo.publicId);
    }

    return this.brandRequestRepository.updateOne(
      { _id: new Types.ObjectId(requestId) },
      {
        // ─── FIXED: BrandRequestStatus بييجي من الـ entity ──────
        status: BrandRequestStatus.REJECTED,
        rejectionReason: dto.rejectionReason,
        reviewedBy: user._id,
        reviewedAt: new Date(),
      },
      { new: true },
    );
  }

  // ─── Update Brand Stats ───────────────────────────────────────
  async updateBrandStats(brandId: string, stats: UpdateBrandStatsDto) {
    const brand = await this.brandRepository.getOne({
      _id: new Types.ObjectId(brandId),
      isDeleted: false,
    });
    if (!brand) throw new NotFoundException('Brand not found');

    const updatePayload: Record<string, any> = {};
    if (stats.totalProducts !== undefined) updatePayload['stats.totalProducts'] = stats.totalProducts;
    if (stats.averageRating !== undefined) updatePayload['stats.averageRating'] = stats.averageRating;
    if (stats.totalReviews !== undefined) updatePayload['stats.totalReviews'] = stats.totalReviews;
    if (stats.totalSales !== undefined) updatePayload['stats.totalSales'] = stats.totalSales;

    return this.brandRepository.updateOne(
      { _id: new Types.ObjectId(brandId) },
      updatePayload,
      { new: true },
    );
  }

  // ─── Private Helpers ──────────────────────────────────────────
  private async checkSlugConflict(slug: string, excludeId?: string) {
    const filter: Record<string, any> = { slug, isDeleted: false };
    if (excludeId) filter._id = { $ne: new Types.ObjectId(excludeId) };
    const exists = await this.brandRepository.getOne(filter);
    if (exists) throw new ConflictException('Brand name already exists');
  }
}