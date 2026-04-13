import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';

import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { CategoryFactoryService } from './factory';
import { CategoryRepository } from '../../models/category/category.repository';
import { Category, CategorySchema } from '@models/category/category.schema';
import { UserMongoModule } from '@shared/modules/user-mongo.module';

@Module({
  imports: [
    UserMongoModule,
    MongooseModule.forFeature([{ name: Category.name, schema: CategorySchema }]),
    JwtModule,
  ],
  controllers: [CategoryController],
  providers: [CategoryService, CategoryRepository, CategoryFactoryService],
  exports: [CategoryService],
})
export class CategoryModule {}