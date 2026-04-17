import { RegisterDto } from "../dto/register.dto";
import * as bcrypt from 'bcrypt';
import { generateOtp } from "../../../common/helpers";
import { Injectable } from "@nestjs/common";
import { Customer } from "../entities/auth.entity";

@Injectable()
export class AuthFactoryService {
    async createCustomer(registerDto: RegisterDto) {
        const customer = new Customer();
        customer.userName = registerDto.userName;
        customer.email = registerDto.email;
        customer.password = await bcrypt.hash(registerDto.password, 10);
        customer.otp = generateOtp();
        customer.dob = registerDto.dob;
        customer.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        customer.isVerified = false;
        (customer as any).role = registerDto.role || 'Customer';
        return customer;
    } 
}
