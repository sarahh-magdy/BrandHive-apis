import { RegisterDto } from '../dto/register.dto';
import * as bcrypt from 'bcrypt';
import { Injectable } from '@nestjs/common';
import { Customer } from '../entities/auth.entity';

@Injectable()
export class AuthFactoryService {
  async createCustomer(registerDto: RegisterDto): Promise<Customer> {
    const customer = new Customer();
    customer.userName = registerDto.userName;
    customer.email = registerDto.email;
    customer.password = await bcrypt.hash(registerDto.password, 10);
    customer.dob = registerDto.dob;
    customer.isVerified = false;
    customer.otp = Math.floor(100000 + Math.random() * 900000).toString();
    customer.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    (customer as any).role = 'Customer';
    return customer;
  }
}