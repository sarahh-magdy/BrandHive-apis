import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from '../../models/order/order.schema';
import { OrderRepository } from '../../models/order/order.repository';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';

/**
 * Import and add your CartModule, ProductModule, CouponModule, etc.
 * here as needed. Example:
 *
 * import { CartModule } from '../cart/cart.module';
 * import { ProductModule } from '../product/product.module';
 */

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    // CartModule,
    // ProductModule,
    // CouponModule,
    // UserModule,
    // NotificationModule,
  ],
  controllers: [OrderController],
  providers: [OrderService, OrderRepository],
  exports: [OrderService, OrderRepository],
})
export class OrderModule {}