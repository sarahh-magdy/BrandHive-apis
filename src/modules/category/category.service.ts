import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoryRepository } from 'src/models/category/category.repository';
import { Category } from './entities/category.entity';
import { Types } from 'mongoose';
import { GetCategoriesDto } from './dto/get-category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly categoryRepository: CategoryRepository) {}

//CREATE
  async create(category: Category) {
    const categoryExist = await this.categoryRepository.getOne({ slug: category.slug });
    if (categoryExist) {
      throw new ConflictException('Category already exists');
    }
    return await this.categoryRepository.create({ ...category });
  }

//GET ALL
  async findAll(query: GetCategoriesDto) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = { isDeleted: false };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ];
    }

  const [data, total] = await Promise.all([
  this.categoryRepository.getAllLean(filter, { skip, limit }),
  this.categoryRepository.count(filter),
]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

//GET ONE
  async findOne(id: string) {
    const category = await this.categoryRepository.getOne({
      _id: new Types.ObjectId(id),
      isDeleted: false,
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

//UPDATE
  async update(id: string, category: Category) {
    const categoryExist = await this.categoryRepository.getOne({
      slug: category.slug,
      _id: { $ne: new Types.ObjectId(id) },
      isDeleted: false,
    });
    if (categoryExist) {
      throw new ConflictException('Category name already exists');
    }
    const updated = await this.categoryRepository.updateOne(
      { _id: new Types.ObjectId(id), isDeleted: false },
      category,
      { new: true },
    );
    if (!updated) {
      throw new NotFoundException('Category not found');
    }
    return updated;
  }

//DELETE
  async delete(id: string, userId: Types.ObjectId) {
    const category = await this.categoryRepository.getOne({
      _id: new Types.ObjectId(id),
      isDeleted: false,
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    await this.categoryRepository.updateOne(
      { _id: new Types.ObjectId(id) },
      { isDeleted: true, deletedBy: userId, deletedAt: new Date() },
      { new: true },
    );
    
    return {
      success: true,
      message: 'Category deleted successfully',
    };
  }
}
