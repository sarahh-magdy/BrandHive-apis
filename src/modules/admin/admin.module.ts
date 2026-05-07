import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

import { User, UserSchema } from '../../models/common/user.schema';
import { Order, OrderSchema } from '../../models/order/order.schema';
import { Product, ProductSchema } from '../../models/product/product.schema';
import { Review, ReviewSchema } from '../../models/review/review.schema';
import { UserMongoModule } from '../../shared/modules/user-mongo.module';

@Module({
    imports: [
        UserMongoModule,
        JwtModule,
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: Order.name, schema: OrderSchema },
            { name: Product.name, schema: ProductSchema },
            { name: Review.name, schema: ReviewSchema },
        ]),
    ],
    controllers: [AdminController],
    providers: [AdminService],
    exports: [AdminService],
})
export class AdminModule { }