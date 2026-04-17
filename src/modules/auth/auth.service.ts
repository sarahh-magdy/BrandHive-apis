import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
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

  async register(customer: Customer) {
    const exists = await this.customerRepository.getOne({
      email: customer.email,
    });

    if (exists) {
      throw new ConflictException('Customer already exists');
    }

    const created = await this.customerRepository.create(customer);

    await sendMail({
      from: this.configService.get('EMAIL_USER'),
      to: customer.email,
      subject: 'Confirm your email - Brand Hive',
      html: `<h3>Your OTP is : ${customer.otp}</h3>`,
    });

    const { password, otp, otpExpiry, ...safe } =
      JSON.parse(JSON.stringify(created));

    return safe as Customer;
  }

  async confirmEmail(email: string, otp: string) {
    const customer = await this.customerRepository.getOne({ email });

    if (!customer) {
      throw new UnauthorizedException('Customer not found');
    }

    if (customer.otp !== otp || new Date() > customer.otpExpiry) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    await this.customerRepository.update(
      { email },
      { isVerified: true, otp: null, otpExpiry: null },
    );

    const token = this.jwtService.sign(
      {
        _id: customer._id,
        role: 'customer',
        email: customer.email,
      },
      {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: '1d',
      },
    );

    return { message: 'Email confirmed successfully', token };
  }

  async login(loginDto: LoginDto) {
    const customer = await this.userRepository.getOne({
      email: loginDto.email,
    });

    if (!customer) {
      throw new UnauthorizedException('Customer does not exist');
    }

    const match = await bcrypt.compare(
      loginDto.password,
      customer.password,
    );

    if (!match) {
      throw new UnauthorizedException('Invalid password');
    }

    const token = this.jwtService.sign(
      {
        _id: customer._id,
        role: 'customer',
        email: customer.email,
      },
      {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: '1d',
      },
    );

    return token;
  }

  async logout(token: string) {
    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  async forgotPassword(email: string) {
    const customer = await this.customerRepository.getOne({ email });

    if (!customer) {
      throw new UnauthorizedException(
        'If this email exists, an OTP has been sent.',
      );
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

  async verifyResetCode(email: string, otp: string) {
    const customer = await this.customerRepository.getOne({ email });

    if (!customer || customer.otp !== otp || new Date() > customer.otpExpiry) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    return { message: 'OTP is valid. You can now reset your password.' };
  }

  async resetPassword(email: string, otp: string, newPass: string) {
    const customer = await this.customerRepository.getOne({ email });

    if (!customer || customer.otp !== otp || new Date() > customer.otpExpiry) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const hashed = await bcrypt.hash(newPass, 10);

    await this.customerRepository.update(
      { email },
      { password: hashed, otp: null, otpExpiry: null },
    );

    return { message: 'Password has been reset successfully' };
  }

  async updateLoggedUserPassword(
    customerId: string,
    oldPass: string,
    newPass: string,
  ) {
    const customer = await this.customerRepository.getOne({
      _id: customerId,
    });

    const match = await bcrypt.compare(
      oldPass,
      customer?.password || '',
    );

    if (!match) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashed = await bcrypt.hash(newPass, 10);

    await this.customerRepository.update(
      { _id: customerId },
      { password: hashed },
    );

    return { message: 'Password updated successfully' };
  }

  async updateLoggedUserData(
    customerId: string,
    updateData: Partial<Customer>,
  ) {
    const { password, otp, otpExpiry, ...clean } = updateData as any;

    const updated = await this.customerRepository.update(
      { _id: customerId },
      clean,
    );

    if (!updated) {
      throw new UnauthorizedException('Customer not found');
    }

    return {
      message: 'Profile updated successfully',
      data: updated,
    };
  }
}