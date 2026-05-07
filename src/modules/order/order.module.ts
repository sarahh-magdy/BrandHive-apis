import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';

import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderFactoryService } from './factory';
import { OrderRepository } from '../../models/order/order.repository';
import { Order, OrderSchema } from '../../models/order/order.schema';

import { Product, ProductSchema } from '../../models/product/product.schema';
import { ProductRepository } from '../../models/product/product.repository';

import { Cart, CartSchema } from '../../models/cart/cart.schema';
import { CartRepository } from '../../models/cart/cart.repository';
import { CartService } from '../cart/cart.service';
import { CartFactoryService } from '../cart/factory';

import { NotificationModule } from '../notification/notification.module';
import { PaymentModule } from '../payment/payment.module';
import { AddressModule } from '../address/address.module';
import { CouponModule } from '../coupon/coupon.module';
import { InventoryModule } from '../inventory/inventory.module';
import { UserMongoModule } from '../../shared/modules/user-mongo.module';

@Module({
  imports: [
    UserMongoModule,
    JwtModule,
    NotificationModule,
    // ─── CHANGED: أضفنا PaymentModule, AddressModule, CouponModule, InventoryModule
    PaymentModule,
    AddressModule,
    CouponModule,
    InventoryModule,
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Cart.name, schema: CartSchema },
    ]),
  ],
  controllers: [OrderController],
  providers: [
    OrderService,
    OrderFactoryService,
    OrderRepository,
    ProductRepository,
    CartService,
    CartFactoryService,
    CartRepository,
  ],
  exports: [OrderService],
})
export class OrderModule { }