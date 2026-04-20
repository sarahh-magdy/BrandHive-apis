import {
  Controller,
  Post,
  Body,
  UseGuards,
  Put,
  Param,
  Get,
  Delete,
  Query,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { User } from '@common/decorators/user.decorator';
import { CategoryFactoryService } from './factory';
import { Auth } from '@common/decorators';
import { AuthGuard } from '@common/guards';
import { GetCategoriesDto } from './dto/get-category.dto';

@Controller('category')
@UseGuards(AuthGuard)
export class CategoryController {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly categoryFactoryService: CategoryFactoryService,
  ) {}

  // Admin Only
  @Post()
  @Auth(['Admin' ])
  async create(@Body() createCategoryDto: CreateCategoryDto, @User() user: any) {
    const category = this.categoryFactoryService.createCategory(createCategoryDto, user);
    const categoryCreated = await this.categoryService.create(category);
    return {
      success: true,
      message: 'Category created successfully',
      data: categoryCreated,
    };
  }
  @Put(':id')
  @Auth(['Admin'])
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @User() user: any,
  ) {
    const category = await this.categoryFactoryService.updateCategory(id, updateCategoryDto, user);
    const updatedCategory = await this.categoryService.update(id, category);
    return {
      success: true,
      message: 'Category updated successfully',
      data: updatedCategory,
    };
  }

  @Delete(':id')
  @Auth(['Admin'])
  async delete(@Param('id') id: string, @User() user: any) {
    await this.categoryService.delete(id, user._id);
    return {
      success: true,
      message: 'Category deleted successfully',
    };
  }

  // Admin + Customer
  @Get()
  @Auth(['Admin', 'Customer'])
  async findAll(@Query() query: GetCategoriesDto) {
    const result = await this.categoryService.findAll(query);
    return {
      success: true,
      message: 'Categories fetched successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(':id')
  @Auth(['Admin', 'Customer'])
  async findOne(@Param('id') id: string) {
    const category = await this.categoryService.findOne(id);
    return {
      success: true,
      message: 'Category fetched successfully',
      data: category,
    };
  }
}