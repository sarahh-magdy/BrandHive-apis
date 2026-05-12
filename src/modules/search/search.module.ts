import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';

import { SearchController } from './search.controller';
import { SearchService } from './search.service';

import { ProductRepository } from '../../models/product/product.repository';
import { Product, ProductSchema } from '../../models/product/product.schema';

import { ProductFactoryService } from '../product/factory';

import { Brand, BrandSchema } from '../../models/brand/brand.schema';
import { BrandRepository } from '../../models/brand/brand.repository';
import { UserMongoModule } from '../../shared/modules/user-mongo.module';

import { CloudinaryModule } from '../../config/cloudinary/cloudinary.module';
@Module({
    imports: [
        UserMongoModule,
        JwtModule,

        CloudinaryModule,

        MongooseModule.forFeature([
            { name: Product.name, schema: ProductSchema },
            { name: Brand.name, schema: BrandSchema }, // ─── ADDED

        ]),
    ],

    controllers: [SearchController],

    providers: [
        SearchService,
        ProductRepository,
        ProductFactoryService,
        BrandRepository,
    ],

    exports: [SearchService],
})
export class SearchModule { }