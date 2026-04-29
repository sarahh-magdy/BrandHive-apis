import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from '../../models/order/order.schema';
import { OrderRepository } from '../../models/order/order.repository';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { CartModule } from '../cart/cart.module';
import { ProductModule } from '../product/product.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    CartModule,
    ProductModule,
    NotificationModule,
  ],
  controllers: [OrderController],
  providers: [OrderService, OrderRepository],
  exports: [OrderService], // ✅ مهم جداً
})
export class OrderModule {}