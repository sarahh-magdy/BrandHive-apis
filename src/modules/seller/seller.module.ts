import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';

import { SellerController } from './seller.controller';
import { SellerService } from './seller.service';

import { BazaarRepository } from '../../models/bazaar/bazaar.repository';
import { Bazaar, BazaarSchema } from '../../models/bazaar/bazaar.schema';

import { ProductRepository } from '../../models/product/product.repository';
import { Product, ProductSchema } from '../../models/product/product.schema';

import { OrderRepository } from '../../models/order/order.repository';
import { Order, OrderSchema } from '../../models/order/order.schema';

import { ReviewRepository } from '../../models/review/review.repository';
import { Review, ReviewSchema } from '../../models/review/review.schema';

import { StockLog, StockLogSchema } from '../../models/stock-log/stock-log.schema';
import { StockLogRepository } from '../../models/stock-log/stock-log.repository';

import { ProductFactoryService } from '../product/factory';
import { InventoryModule } from '../inventory/inventory.module';
import { CloudinaryModule } from '../../config/cloudinary/cloudinary.module';
import { NotificationModule } from '../notification/notification.module';
import { UserMongoModule } from '../../shared/modules/user-mongo.module';

@Module({
    imports: [
        UserMongoModule,
        JwtModule,
        CloudinaryModule,
        InventoryModule,
        NotificationModule,
        MongooseModule.forFeature([
            { name: Bazaar.name, schema: BazaarSchema },
            { name: Product.name, schema: ProductSchema },
            { name: Order.name, schema: OrderSchema },
            { name: Review.name, schema: ReviewSchema },
            { name: StockLog.name, schema: StockLogSchema },
        ]),
    ],
    controllers: [SellerController],
    providers: [
        SellerService,
        BazaarRepository,
        ProductRepository,
        OrderRepository,
        ReviewRepository,
        StockLogRepository,
        ProductFactoryService,
    ],
    exports: [SellerService],
})
export class SellerModule { }