import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { CustomerRepository } from '@models/index';
import { UserRepository } from '../../models/common/user.repository';
import { ConfigService } from '@nestjs/config';
import { Customer } from './entities/auth.entity';
import { sendMail } from '../../common/helpers/send-mail.helper';
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

  // 1. تسجيل مستخدم جديد
  async register(customer: Customer) {
    const customerExist = await this.customerRepository.getOne({ email: customer.email });
    if (customerExist) {
      throw new ConflictException('Customer already exists');
    }

    const createdCustomer = await this.customerRepository.create(customer);

    // إرسال إيميل التأكيد
    try {
      await sendMail({
        from: this.configService.get<string>('EMAIL_USER') || '',
        to: customer.email,
        subject: 'Confirm your email - Brand Hive',
        html: `<h3>Your OTP is: <b>${customer.otp}</b></h3>`,
      });
    } catch (error) {
      // بنطبع الخطأ بس مش بنوقف الـ Register عشان اليوزر ميتعطلش
      console.error('Failed to send registration email:', error.message);
    }

    const { password, otp, otpExpiry, ...customerobj } = JSON.parse(JSON.stringify(createdCustomer));
    return customerobj as Customer;
  }

  // 2. تأكيد الإيميل عن طريق الـ OTP
  async confirmEmail(email: string, otp: string) {
    const customer = await this.customerRepository.getOne({ email });

    if (!customer) throw new UnauthorizedException('Customer not found');

    // مقارنة آمنة بتحويل الطرفين لـ String والتأكد من الصلاحية
    const isOtpInvalid = String(customer.otp) !== String(otp);
    const isExpired = new Date() > new Date(customer.otpExpiry);

    if (isOtpInvalid || isExpired) {
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

  // 3. تسجيل الدخول
  async login(loginDto: LoginDto) {
    const customerExist = await this.userRepository.getOne({ email: loginDto.email });
    if (!customerExist) {
      throw new UnauthorizedException('Customer does not exist');
    }
    const match = await bcrypt.compare(loginDto.password, customerExist.password);
    if (!match) {
      throw new UnauthorizedException('Invalid password');
    }
    
    return this.jwtService.sign(
      { _id: customerExist._id, role: 'customer', email: customerExist.email },
      { secret: this.configService.get('JWT_SECRET') || 'fallback_secret', expiresIn: '1d' },
    );
  }

  // 4. تسجيل الخروج
  async logout(token: string) {
    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  // 5. طلب استعادة كلمة المرور
  async forgotPassword(email: string) {
    const customer = await this.customerRepository.getOne({ email });
    if (!customer) {
      throw new UnauthorizedException('If this email exists, an OTP has been sent.');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 دقائق

    await this.customerRepository.update({ email }, { otp, otpExpiry });

    try {
      await sendMail({
        from: this.configService.get<string>('EMAIL_USER') || '',
        to: email,
        subject: 'Reset Your Password - Brand Hive',
        html: `<h3>Your password reset code is: <b>${otp}</b></h3>`,
      });
    } catch (error) {
      console.error('Failed to send reset email:', error.message);
    }
    return { message: 'Reset code sent successfully' };
  }

  // 6. التحقق من كود الاستعادة
  async verifyResetCode(email: string, otp: string) {
    const customer = await this.customerRepository.getOne({ email });
    if (!customer || String(customer.otp) !== String(otp) || new Date() > new Date(customer.otpExpiry)) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }
    return { message: 'OTP is valid. You can now reset your password.' };
  }

  // 7. تعيين كلمة مرور جديدة
  async resetPassword(email: string, otp: string, newPass: string) {
    const customer = await this.customerRepository.getOne({ email });
    if (!customer || String(customer.otp) !== String(otp) || new Date() > new Date(customer.otpExpiry)) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const hashedPass = await bcrypt.hash(newPass, 10);
    await this.customerRepository.update(
      { email },
      { password: hashedPass, otp: null, otpExpiry: null },
    );
    return { message: 'Password has been reset successfully' };
  }

  // 8. تحديث كلمة المرور للمستخدم المسجل
  async updateLoggedUserPassword(customerId: string, oldPass: string, newPass: string) {
    const customer = await this.customerRepository.getOne({ _id: customerId });
    const isMatch = await bcrypt.compare(oldPass, customer?.password || '');
    if (!isMatch) throw new UnauthorizedException('Current password is incorrect');

    const hashedPass = await bcrypt.hash(newPass, 10);
    await this.customerRepository.update({ _id: customerId }, { password: hashedPass });
    return { message: 'Password updated successfully' };
  }

  // 9. تحديث بيانات الملف الشخصي
  async updateLoggedUserData(customerId: string, updateData: Partial<Customer>) {
    const { password, otp, otpExpiry, ...cleanData } = updateData as any;
    const updatedCustomer = await this.customerRepository.update({ _id: customerId }, cleanData);
    if (!updatedCustomer) throw new UnauthorizedException('Customer not found');
    return { message: 'Profile updated successfully', data: updatedCustomer };
  }
}