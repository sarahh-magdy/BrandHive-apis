import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import {
  CustomerRepository,
  SellerRepository,
  AdminRepository,
} from '@models/index';
import { ConfigService } from '@nestjs/config';
import { sendMail } from '@common/helpers';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly customerRepository: CustomerRepository,
    private readonly sellerRepository: SellerRepository,
    private readonly adminRepository: AdminRepository,
    private readonly jwtService: JwtService,
  ) {}

  // ─── Helpers ──────────────────────────────────────────────────

  private signToken(payload: { _id: any; role: string; email: string }) {
    return this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET') || 'fallback_secret',
      expiresIn: '1d',
    });
  }

  // ✅ role lowercase دايماً عشان يتطابق مع الـ repoMap
  private getRepoByRole(role: string) {
    const map: Record<string, any> = {
      customer: this.customerRepository,
      seller: this.sellerRepository,
      admin: this.adminRepository,
    };
    return map[role.toLowerCase()] ?? null;
  }

  // ✅ بندور في الـ 3 collections عشان login/forgot/verify/reset يشتغلوا مع كل الـ roles
  private async findUserByEmail(email: string) {
    return (
      (await this.customerRepository.getOne({ email })) ||
      (await this.sellerRepository.getOne({ email })) ||
      (await this.adminRepository.getOne({ email })) ||
      null
    );
  }

  // ─── REGISTER ─────────────────────────────────────────────────
  // ✅ بتاخد RegisterDto مباشرة وبتعمل hashing هنا
  // ✅ role دايماً 'Customer' — مش جاية من الـ body
  async register(registerDto: RegisterDto) {
    const customerExist = await this.customerRepository.getOne({
      email: registerDto.email,
    });
    if (customerExist) throw new ConflictException('Email already registered');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const createdCustomer = await this.customerRepository.create({
      userName: registerDto.userName,
      email: registerDto.email,
      password: hashedPassword,
      dob: registerDto.dob,
      isVerified: false,
      otp,
      otpExpiry,
      role: 'Customer',
    } as any);

    await sendMail({
      from: this.configService.get('EMAIL_USER'),
      to: registerDto.email,
      subject: 'Confirm your email - Brand Hive',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Brand Hive! 👋</h2>
          <p>Use the code below to confirm your email. It expires in <b>10 minutes</b>.</p>
          <div style="background: #f4f4f4; padding: 20px; text-align: center; border-radius: 8px;">
            <h1 style="letter-spacing: 8px; color: #333;">${otp}</h1>
          </div>
          <p style="color: #888; font-size: 12px;">If you didn't register, ignore this email.</p>
        </div>
      `,
    });

    const {
      password,
      otp: _otp,
      otpExpiry: _exp,
      ...customerObj
    } = JSON.parse(JSON.stringify(createdCustomer));

    return customerObj;
  }

  // ─── CONFIRM EMAIL ────────────────────────────────────────────
  // ✅ customers فقط — register للـ customers بس
  async confirmEmail(email: string, otp: string) {
    const customer = await this.customerRepository.getOne({ email });
    if (!customer) throw new UnauthorizedException('Account not found');

    if (customer.isVerified)
      throw new BadRequestException('Email already verified');

    if (customer.otp !== otp)
      throw new UnauthorizedException('Invalid OTP');

    if (new Date() > customer.otpExpiry) {
      throw new UnauthorizedException(
        'OTP has expired, please request a new one',
      );
    }

    await this.customerRepository.updateOne(
      { email },
      { isVerified: true, otp: null, otpExpiry: null },
      { new: true },
    );

    // ✅ بنرجع token مباشرة بعد الـ confirm عشان الـ user يـ login أوتوماتيك
    const token = this.signToken({
      _id: customer._id,
      role: 'Customer',
      email: customer.email,
    });

    return { message: 'Email confirmed successfully', token };
  }

  // ─── RESEND OTP ───────────────────────────────────────────────
  // ✅ customers فقط
  async resendOtp(email: string) {
    const customer = await this.customerRepository.getOne({ email });
    if (!customer) throw new UnauthorizedException('Account not found');
    if (customer.isVerified)
      throw new BadRequestException('Email already verified');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await this.customerRepository.updateOne(
      { email },
      { otp, otpExpiry },
      { new: true },
    );

    await sendMail({
      from: this.configService.get('EMAIL_USER'),
      to: email,
      subject: 'New OTP - Brand Hive',
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>New Verification Code</h2>
          <div style="background: #f4f4f4; padding: 20px; text-align: center; border-radius: 8px;">
            <h1 style="letter-spacing: 8px; color: #333;">${otp}</h1>
          </div>
          <p>This code expires in <b>10 minutes</b>.</p>
        </div>
      `,
    });

    return { message: 'New OTP sent successfully' };
  }

  // ─── LOGIN ────────────────────────────────────────────────────
  // ✅ Bug الأساسي اتحل: كان بيدور في userRepository (User collection)
  //    لكن الـ users محفوظين في Customer/Seller/Admin collections منفصلة
  //    دلوقتي بيدور في الـ 3 collections
  async login(loginDto: LoginDto) {
    const user = await this.findUserByEmail(loginDto.email);
    if (!user) throw new UnauthorizedException('Invalid email or password');

    const match = await bcrypt.compare(loginDto.password, user.password);
    if (!match) throw new UnauthorizedException('Invalid email or password');

    const role: string = user.role ?? 'Customer';

    // ✅ isVerified check للـ Customer بس
    // الـ Admin والـ Seller بيتعملوا manually من غير email verification
    if (role.toLowerCase() === 'customer' && !user.isVerified) {
      throw new UnauthorizedException('Please verify your email first');
    }

    const token = this.signToken({
      _id: user._id,
      role,
      email: user.email,
    });

    return token;
  }

  // ─── LOGOUT ───────────────────────────────────────────────────
  // TODO: لو عايز token blacklist تضيف Redis هنا
  async logout(_token: string) {
    return { success: true, message: 'Logged out successfully' };
  }

  // ─── FORGOT PASSWORD ──────────────────────────────────────────
  // ✅ Bug اتحل: كان بيدور في userRepository بس
  //    دلوقتي بيدور في الـ 3 collections — بيشتغل مع Customer/Seller/Admin
  async forgotPassword(email: string) {
    const user = await this.findUserByEmail(email);

    // ✅ Security: مش بنقول للـ user لو الـ email موجود ولا لأ
    if (!user) return { message: 'If this email exists, an OTP has been sent.' };

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    const role: string = user.role ?? 'Customer';
    const repo = this.getRepoByRole(role);
    await repo.updateOne({ email }, { otp, otpExpiry }, { new: true });

    await sendMail({
      from: this.configService.get('EMAIL_USER'),
      to: email,
      subject: 'Reset Your Password - Brand Hive',
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Password Reset Request</h2>
          <p>Your password reset code:</p>
          <div style="background: #f4f4f4; padding: 20px; text-align: center; border-radius: 8px;">
            <h1 style="letter-spacing: 8px; color: #333;">${otp}</h1>
          </div>
          <p>Expires in <b>10 minutes</b>. If you didn't request this, ignore this email.</p>
        </div>
      `,
    });

    return { message: 'If this email exists, an OTP has been sent.' };
  }

  // ─── VERIFY RESET CODE ────────────────────────────────────────
  // ✅ Bug اتحل: كان بيدور في userRepository بس
  async verifyResetCode(email: string, otp: string) {
    const user = await this.findUserByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid or expired OTP');

    if (user.otp !== otp) throw new UnauthorizedException('Invalid OTP');
    if (new Date() > user.otpExpiry)
      throw new UnauthorizedException('OTP has expired');

    return { message: 'OTP verified. You can now reset your password.' };
  }

  // ─── RESET PASSWORD ───────────────────────────────────────────
  // ✅ Bug اتحل: كان بيدور في userRepository بس
  async resetPassword(email: string, otp: string, newPass: string) {
    const user = await this.findUserByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid or expired OTP');
    if (user.otp !== otp) throw new UnauthorizedException('Invalid OTP');
    if (new Date() > user.otpExpiry)
      throw new UnauthorizedException('OTP has expired');

    const hashedPass = await bcrypt.hash(newPass, 10);
    const role: string = user.role ?? 'Customer';
    const repo = this.getRepoByRole(role);

    await repo.updateOne(
      { email },
      { password: hashedPass, otp: null, otpExpiry: null },
      { new: true },
    );

    return { message: 'Password reset successfully' };
  }

  // ─── UPDATE PASSWORD ──────────────────────────────────────────
  async updateLoggedUserPassword(
    userId: string,
    oldPass: string,
    newPass: string,
    role: string,
  ) {
    const repo = this.getRepoByRole(role);
    if (!repo) throw new UnauthorizedException('Invalid role');

    const user = await repo.getOne({ _id: userId });
    if (!user) throw new UnauthorizedException('User not found');

    const isMatch = await bcrypt.compare(oldPass, user.password);
    if (!isMatch)
      throw new UnauthorizedException('Current password is incorrect');

    const hashedPass = await bcrypt.hash(newPass, 10);
    await repo.updateOne({ _id: userId }, { password: hashedPass }, { new: true });

    return { message: 'Password updated successfully' };
  }

  // ─── UPDATE PROFILE ───────────────────────────────────────────
  async updateLoggedUserData(userId: string, updateData: any, role: string) {
    // ✅ منع تعديل الـ sensitive fields
    const { password, otp, otpExpiry, role: _role, ...cleanData } = updateData;
    const repo = this.getRepoByRole(role);
    if (!repo) throw new UnauthorizedException('Invalid role');

    const updated = await repo.updateOne({ _id: userId }, cleanData, {
      new: true,
    });
    if (!updated) throw new UnauthorizedException('User not found');

    return { message: 'Profile updated successfully', data: updated };
  }

  // ─── CREATE SELLER (called after Brand Request approved) ──────
  async createSellerFromRequest(data: {
    name: string;
    email: string;
    whatsappLink: string;
  }) {
    const existing = await this.sellerRepository.getOne({ email: data.email });
    if (existing) return existing;

    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';
    const hashedPass = await bcrypt.hash(tempPassword, 10);

    const seller = await this.sellerRepository.create({
      userName: data.name,
      email: data.email,
      password: hashedPass,
      whatsappLink: data.whatsappLink,
      role: 'Seller',
    } as any);

    await sendMail({
      from: this.configService.get('EMAIL_USER'),
      to: data.email,
      subject: 'Your Seller Account is Ready - Brand Hive 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Brand Hive as a Seller! 🎉</h2>
          <p>Your brand request has been approved. Here are your login credentials:</p>
          <div style="background: #f4f4f4; padding: 20px; border-radius: 8px;">
            <p><b>Email:</b> ${data.email}</p>
            <p><b>Temporary Password:</b> ${tempPassword}</p>
          </div>
          <p style="color: #e74c3c;"><b>Please change your password after logging in.</b></p>
        </div>
      `,
    });

    return seller;
  }
}