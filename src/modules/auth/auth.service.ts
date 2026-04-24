import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from '../../models/common/user.repository';
import { UserRole } from '../../models/common/user.schema';
import {
  generateOtp,
  getOtpExpiry,
  isOtpExpired,
} from '../../common/helpers/otp.helper';
import {
  sendMail,
  otpEmailTemplate,
} from '../../common/helpers/send-mail.helper';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ConfirmEmailDto } from './dto/confirm-email.dto';
import {
  ForgetPasswordDto,
  VerifyResetCodeDto,
  ResetPasswordDto,
} from './dto/reset-password.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { sendSms } from '../../common/helpers/send-sms.helper';
const OTP_LOCK_MINUTES = 15;
const MAX_OTP_ATTEMPTS = 5;
const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  //  REGISTER 
async register(dto: RegisterDto) {
  if (!dto.email && !dto.phone) {
    throw new BadRequestException('Email or phone is required');
  }

  // check existing
  const existing = await this.userRepository.findOne({
    $or: [{ email: dto.email }, { phone: dto.phone }],
  });

  if (existing) {
    throw new ConflictException('Email or phone already in use');
  }

  const hashedPassword = await bcrypt.hash(dto.password, 12);

  const otp = generateOtp();
  const hashedOtp = await bcrypt.hash(otp, 10);
  const otpExpires = getOtpExpiry(10);

  const user = await this.userRepository.create({
    name: dto.name,
    email: dto.email,
    phone: dto.phone,
    government: dto.government,
    password: hashedPassword,
    role: UserRole.CUSTOMER,
    otp: hashedOtp,
    otpExpires,
    isEmailVerified: false,
    isPhoneVerified: false,
  });

  // send OTP
  try {
    if (dto.email) {
      await sendMail({
        to: dto.email,
        subject: 'Verify Email',
        html: otpEmailTemplate(otp, 'verify'),
      });
    } else if (dto.phone) {
      await sendSms(dto.phone, `Your OTP is ${otp}`);
    }
  } catch (err) {
    console.error('OTP send failed:', err.message);
  }

  return {
    message: 'Registration successful. Verify your account.',
    userId: user._id,
  };
}

  //  CONFIRM EMAIL 
async confirmOtp(dto: ConfirmEmailDto) {
  const user = await this.userRepository.findOne(
    {
      $or: [{ email: dto.email }, { phone: dto.phone }],
    },
    '+otp +otpExpires +otpAttempts +otpLockUntil',
  );

  if (!user) throw new NotFoundException('User not found');

  if (
    (user.email && user.isEmailVerified) ||
    (user.phone && user.isPhoneVerified)
  ) {
    throw new BadRequestException('Already verified');
  }

  if (user.otpLockUntil && new Date() < new Date(user.otpLockUntil)) {
    const minutesLeft = Math.ceil(
      (new Date(user.otpLockUntil).getTime() - Date.now()) / 60000,
    );
    throw new ForbiddenException(
      `Too many attempts. Try again in ${minutesLeft} minutes.`,
    );
  }

  if (!user.otp || !user.otpExpires) {
    throw new BadRequestException('No OTP found.');
  }

  if (isOtpExpired(user.otpExpires)) {
    throw new BadRequestException('OTP expired.');
  }

  const isMatch = await bcrypt.compare(dto.otp, user.otp);

  if (!isMatch) {
    const attempts = (user.otpAttempts || 0) + 1;

    if (attempts >= MAX_OTP_ATTEMPTS) {
      await this.userRepository.updateById(user._id.toString(), {
        otpAttempts: 0,
        otpLockUntil: getOtpExpiry(OTP_LOCK_MINUTES),
      });

      throw new ForbiddenException('Too many attempts.');
    }

    await this.userRepository.updateById(user._id.toString(), {
      otpAttempts: attempts,
    });

    throw new BadRequestException('Invalid OTP');
  }

  const update: any = {
    otp: null,
    otpExpires: null,
    otpAttempts: 0,
    otpLockUntil: null,
  };

if (dto.email) update.isEmailVerified = true;
if (dto.phone) update.isPhoneVerified = true;

  await this.userRepository.updateById(user._id.toString(), update);

  return { message: 'Verified successfully' };
}

  //  RESEND OTP 
async resendOtp(dto: ResendOtpDto) {
  const user = await this.userRepository.findOne(
    {
      $or: [{ email: dto.email }, { phone: dto.phone }],
    },
    '+otpLockUntil',
  );

  if (!user) throw new NotFoundException('User not found');

  if (
    (user.email && user.isEmailVerified) ||
    (user.phone && user.isPhoneVerified)
  ) {
    throw new BadRequestException('Already verified');
  }

  if (user.otpLockUntil && new Date() < new Date(user.otpLockUntil)) {
    const minutesLeft = Math.ceil(
      (new Date(user.otpLockUntil).getTime() - Date.now()) / 60000,
    );

    throw new ForbiddenException(`Try again in ${minutesLeft} minutes.`);
  }

  const otp = generateOtp();
  const hashedOtp = await bcrypt.hash(otp, 10);
  const otpExpires = getOtpExpiry(10);

  await this.userRepository.updateById(user._id.toString(), {
    otp: hashedOtp,
    otpExpires,
    otpAttempts: 0,
  });

  try {
    if (user.email) {
      await sendMail({
        to: user.email,
        subject: 'New OTP',
        html: otpEmailTemplate(otp, 'verify'),
      });
    } else if (user.phone) {
      await sendSms(user.phone, `Your OTP is ${otp}`);
    }
  } catch (err) {
    console.error('Resend OTP failed:', err.message);
  }

  return { message: 'OTP resent successfully' };
}

  //  LOGIN 
async login(dto: LoginDto) {
  const user = await this.userRepository.findOne(
    {
      $or: [{ email: dto.identifier }, { phone: dto.identifier }],
    },
    '+password',
  );

  if (!user)
    throw new UnauthorizedException('Invalid credentials');

  const isValid = await bcrypt.compare(dto.password, user.password);

  if (!isValid)
    throw new UnauthorizedException('Invalid credentials');

  if (user.email && !user.isEmailVerified)
    throw new ForbiddenException('Verify email first');

  if (user.phone && !user.isPhoneVerified)
    throw new ForbiddenException('Verify phone first');

  const tokens = await this.generateTokens(
    user._id.toString(),
    user.role,
  );

  return {
    message: 'Login successful',
    ...tokens,
  };
}

  //  LOGOUT 
  async logout(userId: string) {
    await this.userRepository.updateById(userId, {
      refreshToken: null,
    });

    return { message: 'Logged out' };
  }

  //  REFRESH 
  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.userRepository.findById(
      userId,
      '+refreshToken',
    );

    if (!user || !user.refreshToken)
      throw new UnauthorizedException('Access denied');

    const match = await bcrypt.compare(refreshToken, user.refreshToken);

    if (!match)
      throw new UnauthorizedException('Access denied');

    const tokens = await this.generateTokens(
      user._id.toString(),
      user.role,
    );

    const hashed = await bcrypt.hash(tokens.refreshToken, 10);

    await this.userRepository.updateById(user._id.toString(), {
      refreshToken: hashed,
    });

    return tokens;
  }

  //  FORGET PASSWORD 
  async forgetPassword(dto: ForgetPasswordDto) {
    const user = await this.userRepository.findByEmail(dto.email);

    if (!user)
      throw new NotFoundException('User not found');

const otp = generateOtp();
const hashedOtp = await bcrypt.hash(otp, 10);
const otpExpires = getOtpExpiry(10);

    await this.userRepository.updateById(user._id.toString(), {
      resetPasswordOtp: hashedOtp,
      resetPasswordOtpExpires: otpExpires,
      resetPasswordVerified: false,
    });

    try {
      await sendMail({
        to: dto.email,
        subject: 'Reset Password',
        html: otpEmailTemplate(otp, 'reset'),
      });
    } catch (err) {
      console.error('Reset email failed:', err.message);
    }

    return { message: 'Reset OTP sent' };
  }

  //  VERIFY RESET 
  async verifyResetCode(dto: VerifyResetCodeDto) {
    const user = await this.userRepository.findByEmail(
      dto.email,
      '+resetPasswordOtp +resetPasswordOtpExpires',
    );

    if (!user) throw new NotFoundException('User not found');

    const match = await bcrypt.compare(
      dto.otp,
      user.resetPasswordOtp,
    );

    if (!match)
      throw new BadRequestException('Invalid reset code');

    await this.userRepository.updateById(user._id.toString(), {
      resetPasswordVerified: true,
    });

    return { message: 'Reset verified' };
  }

  //  RESET PASSWORD 
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userRepository.findByEmail(
      dto.email,
      '+resetPasswordVerified',
    );

    if (!user)
      throw new NotFoundException('User not found');

    if (!user.resetPasswordVerified)
      throw new ForbiddenException('Verify reset code first');

    const hashed = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);

    await this.userRepository.updateById(user._id.toString(), {
      password: hashed,
      resetPasswordOtp: null,
      resetPasswordOtpExpires: null,
      resetPasswordVerified: false,
      refreshToken: null,
    });

    return { message: 'Password reset done' };
  }

  //  CHANGE PASSWORD 
  async changePassword(userId: string, dto: UpdatePasswordDto) {
    const user = await this.userRepository.findById(userId, '+password');

    if (!user)
      throw new NotFoundException('User not found');

    const match = await bcrypt.compare(dto.oldPassword, user.password);

    if (!match)
      throw new BadRequestException('Old password wrong');

    const hashed = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);

    await this.userRepository.updateById(userId, {
      password: hashed,
      refreshToken: null,
    });

    return { message: 'Password changed' };
  }

  //  PROFILE 
  async getProfile(userId: string) {
    const user = await this.userRepository.findById(userId);

    if (!user)
      throw new NotFoundException('User not found');

    return user;
  }

  //  TOKENS 
  private async generateTokens(userId: string, role: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, role },
        {
          secret: process.env.JWT_SECRET,
          expiresIn: '15m',
        },
      ),
      this.jwtService.signAsync(
        { sub: userId, role },
        {
          secret: process.env.JWT_REFRESH_SECRET,
          expiresIn: '7d',
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }
  async createSellerFromRequest(data: {
  email: string;
  name: string;
  whatsappLink?: string;
}) {
  const user = await this.userRepository.findByEmail(data.email);

  if (!user) {
    throw new NotFoundException('User not found');
  }

  // لو هو already seller
  if (user.role === UserRole.SELLER) {
    throw new ConflictException('User already a seller');
  }

  // update role
  await this.userRepository.updateById(user._id.toString(), {
    role: UserRole.SELLER,
    whatsappLink: data.whatsappLink || '',
  });

  return { message: 'User promoted to seller successfully' };
}
async createAdmin(dto: RegisterDto) {
if (!dto.email) {
  throw new BadRequestException('Email is required for admin');
}

const existing = await this.userRepository.findByEmail(dto.email);
  if (existing) {
    throw new ConflictException('Email already exists');
  }

  const hashed = await bcrypt.hash(dto.password, 12);

  const admin = await this.userRepository.create({
    name: dto.name,
    email: dto.email,
    password: hashed,
    role: UserRole.ADMIN,
    isEmailVerified: true,
  });

  return {
    message: 'Admin created successfully',
    admin,
  };
}
}