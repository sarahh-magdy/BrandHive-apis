import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { UserRepository } from "../../models/common/user.repository";
import { User, userSchema } from "../../models/common/user.schema";

import { SellerRepository } from "@models/index";
import { Seller, SellerSchema } from "@models/index";

import { AdminRepository } from "@models/admin/admin.repository";
import { Admin, AdminSchema } from "@models/admin/admin.schema";

import { CustomerRepository } from "@models/customer/customer.repository";
import { Customer, CustomerSchema } from "@models/customer/customer.schema";

@Module({
    imports: [
        MongooseModule.forFeature([{
            name: User.name, 
            schema: userSchema,
            discriminators: [
                { name: Seller.name, schema: SellerSchema },
                { name: Admin.name, schema: AdminSchema },
                { name: Customer.name, schema: CustomerSchema }
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