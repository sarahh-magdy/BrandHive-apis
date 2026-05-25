import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { ProductModule } from './modules/product/product.module';
import { CategoryModule } from './modules/category/category.module';
import { BrandModule } from './modules/brand/brand.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import devConfig from './config/env/dev.config';
import { CustomerModule } from './modules/customer/customer.module';
import { AuthGuard } from '@common/guards/auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { AdminSeed } from './seeds/admin.seed';
import { UserMongoModule } from '@shared/index';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { CartModule } from './modules/cart/cart.module';
import { OrderModule } from './modules/order/order.module';
import { NotificationModule } from './modules/notification/notification.module';
import { AddressModule } from '@modules/address/address.module';
import { CouponModule } from '@modules/coupon/coupon.module';
import { PaymentModule } from './modules/payment/payment.module';
import { AdminModule } from '@modules/admin/admin.module';
import { SearchModule } from '@modules/search/search.module';
import { InventoryModule } from '@modules/inventory/inventory.module';
import { ReviewModule } from '@modules/review/review.module';
import { SellerModule } from '@modules/seller/seller.module';
import { SupportModule } from '@modules/support/support.module';
import { RecommendationModule } from '@modules/recommendation/recommendation.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      load: [devConfig],
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get('database').url,
      }),
    }),
    UserMongoModule,
    AuthModule,
    ProductModule,
    CategoryModule,
    BrandModule,
    CustomerModule,
    WishlistModule,
    CartModule,
    OrderModule,
    NotificationModule,
    AddressModule,
    CouponModule,
    PaymentModule,
    AdminModule,
    SearchModule,
    InventoryModule,
    ReviewModule,
    SellerModule,
    SupportModule,
    RecommendationModule,


  ],
  controllers: [AppController],
  providers: [
    AdminSeed,
    AppService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule { }