import { Module } from "@nestjs/common";
import { 
    SellerRepository, 
    AdminRepository, 
    CustomerRepository, 
    UserRepository,
    User, 
    userSchema, 
    Seller, 
    sellerSchema, 
    Admin, 
    adminSchema, 
    Customer, 
    customerSchema 
} from "src/models";
import { MongooseModule } from "@nestjs/mongoose";

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