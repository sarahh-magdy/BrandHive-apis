import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from '../../models/order/order.schema';
import { OrderRepository } from '../../models/order/order.repository';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';

// استيراد الموديولات الخارجية اللي بتعتمدي عليها
import { UserMongoModule } from '../../shared/index'; // عشان الـ UserRepository اللي في الـ AuthGuard
import { CartModule } from '../cart/cart.module';
import { ProductModule } from '../product/product.module';

@Module({
  imports: [
    // 1. تعريف موديل الأوردر في قاعدة البيانات
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    
    // 2. استيراد الموديولات اللي الـ OrderService والـ AuthGuard محتاجينها
    UserMongoModule, // ضروري جداً عشان الـ Guard
    CartModule,      // ضروري عشان الـ OrderService بيستخدم الـ Cart
    ProductModule,   // ضروري عشان الـ OrderService بيعدل في الـ Stock
  ],
  controllers: [OrderController],
  providers: [
    OrderService, 
    OrderRepository
  ],
  exports: [
    OrderService, 
    OrderRepository
  ],
})
export class OrderModule {}