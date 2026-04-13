import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { Category } from '../entities/category.entity';
import slugify from 'slugify';
import { Types } from 'mongoose';
import { CategoryRepository } from '@models/index';

@Injectable()
export class CategoryFactoryService {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  createCategory(createCategoryDto: CreateCategoryDto, user: any): Category {
    const category = new Category();
    (category as any)._id = new Types.ObjectId();
    category.name = createCategoryDto.name;
    category.slug = slugify(createCategoryDto.name, {
      lower: true,
      trim: true,
      replacement: '-',
    });
    category.createdBy = user._id;
    category.updatedBy = user._id;
    category.logo = createCategoryDto.logo;
    return category;
  }

  async updateCategory(id: string, updateCategoryDto: UpdateCategoryDto, user: any) {
    const oldCategory = (await this.categoryRepository.getOne({
      _id: new Types.ObjectId(id),
      isDeleted: false,
    })) as Category;

    if (!oldCategory) {
      throw new NotFoundException('Category not found');
    }

    const category = new Category();
    const newName = updateCategoryDto.name || oldCategory.name;
    category.name = newName;
    category.slug = slugify(newName, {
      lower: true,
      trim: true,
      replacement: '-',
    });
    category.logo = updateCategoryDto.logo !== undefined ? updateCategoryDto.logo : oldCategory.logo;
    category.updatedBy = user._id;
    return category;
  }
}