import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { UserRepository } from "../../models/common/user.repository";
import { User, userSchema } from "../../models/common/user.schema";

import { SellerRepository } from "../../models/seller/seller.repository";
import { Seller, sellerSchema } from "../../models/seller/seller.schema";

import { AdminRepository } from "../../models/admin/admin.repository";
import { Admin, adminSchema } from "../../models/admin/admin.schema";

import { CustomerRepository } from "../../models/customer/customer.repository";
import { Customer, customerSchema } from "../../models/customer/customer.schema";

@Module({
    imports: [
        MongooseModule.forFeature([{
            name: User.name, 
            schema: userSchema,
            discriminators: [
                { name: Seller.name, schema: sellerSchema },
                { name: Admin.name, schema: adminSchema },
                { name: Customer.name, schema: customerSchema }
            ]
        }])
    ],
    controllers: [],
    providers: [
        SellerRepository,
        AdminRepository, 
        CustomerRepository, 
        UserRepository
    ],
    exports: [
        SellerRepository,
        AdminRepository, 
        CustomerRepository, 
        UserRepository
    ]
})
export class UserMongoModule {}