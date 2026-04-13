import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { CustomerRepository, UserRepository } from '@models/index';
import { ConfigService } from '@nestjs/config';
import { Customer } from './entities/auth.entity';
import { sendMail } from '@common/helpers';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly customerRepository: CustomerRepository,
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

//REGISTER SERVICE
  async register(customer: Customer) {
    const customerExist = await this.customerRepository.getOne({ email: customer.email });
    if (customerExist) {
      throw new ConflictException('Customer already exists');
    }
    const createdCustomer = await this.customerRepository.create(customer);

    sendMail({
      from: this.configService.get('EMAIL_USER'),
      to: customer.email,
      subject: 'Confirm your email - Brand Hive',
      html: `<h3>Your OTP is : ${customer.otp}</h3>`,
    });
    const { password, otp, otpExpiry, ...customerobj } = JSON.parse(JSON.stringify(createdCustomer));
    return customerobj as Customer;
  }
//CONFIRM EMAIL SERVICE
  async confirmEmail(email: string, otp: string) {
    const customer = await this.customerRepository.getOne({ email });
    console.log('Stored:', customer?.otp, 'Type:', typeof customer?.otp);
    console.log('Received:', otp, 'Type:', typeof otp);
    
    if (!customer) throw new UnauthorizedException('Customer not found');
    if (customer.otp !== otp || new Date() > customer.otpExpiry) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    await this.customerRepository.update(
      { email },
      { isVerified: true, otp: null, otpExpiry: null },
    );

    const token = this.jwtService.sign(
      { _id: customer._id, role: 'customer', email: customer.email },
      { secret: this.configService.get('JWT_SECRET') || 'fallback_secret', expiresIn: '1d' },
    );
    return { message: 'Email confirmed successfully', token };
  }

//LOGIN SERVICE
  async login(loginDto: LoginDto) {
    const customerExist = await this.userRepository.getOne({ email: loginDto.email });
    if (!customerExist) {
      throw new UnauthorizedException('Customer does not exist');
    }
    const match = await bcrypt.compare(loginDto.password, customerExist.password);
    if (!match) {
      throw new UnauthorizedException('Invalid password');
    }
    const token = this.jwtService.sign(
      { _id: customerExist._id, role: 'customer', email: customerExist.email },
      { secret: this.configService.get('JWT_SECRET') || 'fallback_secret', expiresIn: '1d' },
    );
    return token;
  }

//LOGOUT SERVICE
  async logout(token: string) {
    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

//FORGOT PASSWORD SERVICE
  async forgotPassword(email: string) {
    const customer = await this.customerRepository.getOne({ email });
    if (!customer) {
      throw new UnauthorizedException('If this email exists, an OTP has been sent.');
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await this.customerRepository.update({ email }, { otp, otpExpiry });

    await sendMail({
      from: this.configService.get('EMAIL_USER'),
      to: email,
      subject: 'Reset Your Password - Brand Hive',
      html: `<h3>Your password reset code is: <b>${otp}</b></h3>`,
    });
    return { message: 'Reset code sent successfully' };
  }

//VERIFY RESET CODE SERVICE
  async verifyResetCode(email: string, otp: string) {
    const customer = await this.customerRepository.getOne({ email });
    if (!customer || customer.otp !== otp || new Date() > customer.otpExpiry) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }
    return { message: 'OTP is valid. You can now reset your password.' };
  }

//RESET PASSWORD SERVICE
  async resetPassword(email: string, otp: string, newPass: string) {
    const customer = await this.customerRepository.getOne({ email });
    if (!customer || customer.otp !== otp || new Date() > customer.otpExpiry) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }
    const hashedPass = await bcrypt.hash(newPass, 10);
    await this.customerRepository.update(
      { email },
      { password: hashedPass, otp: null, otpExpiry: null },
    );
    return { message: 'Password has been reset successfully' };
  }

//UPDATE LOGGED USER PASSWORD SERVICE
  async updateLoggedUserPassword(customerId: string, oldPass: string, newPass: string) {
    const customer = await this.customerRepository.getOne({ _id: customerId });
    const isMatch = await bcrypt.compare(oldPass, customer?.password || '');
    if (!isMatch) throw new UnauthorizedException('Current password is incorrect');

    const hashedPass = await bcrypt.hash(newPass, 10);
    await this.customerRepository.update({ _id: customerId }, { password: hashedPass });
    return { message: 'Password updated successfully' };
  }

//UPDATE LOGGED USER DATA SERVICE
  async updateLoggedUserData(customerId: string, updateData: Partial<Customer>) {
    const { password, otp, otpExpiry, ...cleanData } = updateData as any;
    const updatedCustomer = await this.customerRepository.update({ _id: customerId }, cleanData);
    if (!updatedCustomer) throw new UnauthorizedException('Customer not found');
    return { message: 'Profile updated successfully', data: updatedCustomer };
  }
}