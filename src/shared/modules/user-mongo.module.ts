import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Admin, AdminSchema } from '@models/admin/admin.schema';     // تأكد إنها AdminSchema في ملفها
import { Seller, SellerSchema } from '@models/seller/seller.schema';   // تأكد إنها SellerSchema في ملفها
import { Customer, CustomerSchema } from '@models/customer/customer.schema'; // هو أكدلك إن اسمها CustomerSchema
import { User, UserSchema } from '@models/common/user.schema';
import { AdminRepository, CustomerRepository, SellerRepository, UserRepository } from '@models/index';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: Seller.name, schema: SellerSchema },
      { name: Admin.name, schema: AdminSchema },
      { name: User.name, schema: UserSchema }, // ✅ ضيف السطر ده هنا
    ]),
  ],
  providers: [
    CustomerRepository,
    SellerRepository,
    AdminRepository,
    UserRepository, // الـ Repository موجود فعلاً بس كان ناقصه السطر اللي فوق
  ],
  exports: [
    CustomerRepository,
    SellerRepository,
    AdminRepository,
    UserRepository,
    MongooseModule,
  ],
})
export class UserMongoModule {}