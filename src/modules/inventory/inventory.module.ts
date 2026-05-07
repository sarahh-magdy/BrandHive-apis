import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { StockLogRepository } from '../../models/stock-log/stock-log.repository';
import { StockLog, StockLogSchema } from '../../models/stock-log/stock-log.schema';
import { ProductRepository } from '../../models/product/product.repository';
import { Product, ProductSchema } from '../../models/product/product.schema';
import { NotificationModule } from '../notification/notification.module';
import { UserMongoModule } from '../../shared/modules/user-mongo.module';

@Module({
    imports: [
        UserMongoModule,
        JwtModule,
        NotificationModule,
        MongooseModule.forFeature([
            { name: StockLog.name, schema: StockLogSchema },
            { name: Product.name, schema: ProductSchema },
        ]),
    ],
    controllers: [InventoryController],
    providers: [InventoryService, StockLogRepository, ProductRepository],
    exports: [InventoryService],
})
export class InventoryModule { }