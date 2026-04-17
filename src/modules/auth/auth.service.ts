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
import { sendMail, otpEmailTemplate } from '../../common/helpers/send-mail.helper';
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

const OTP_LOCK_MINUTES = 15;
const MAX_OTP_ATTEMPTS = 5;
const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  // ─── Register ───────────────────────────────────────────────
  async register(dto: RegisterDto) {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const otp = generateOtp();
    const otpExpires = getOtpExpiry(10);

    const user = await this.userRepository.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      role: UserRole.CUSTOMER,
      otp,
      otpExpires,
      isEmailVerified: false,
    });

    await sendMail({
      to: dto.email,
      subject: 'Verify Your Email - BrandHive',
      html: otpEmailTemplate(otp, 'verify'),
    });

    return {
      message: 'Registration successful. Please verify your email.',
      userId: user._id,
    };
  }

  // ─── Confirm Email ───────────────────────────────────────────
  async confirmEmail(dto: ConfirmEmailDto) {
    const user = await this.userRepository.findByEmail(
      dto.email,
      '+otp +otpExpires +otpAttempts +otpLockUntil',
    );

    if (!user) throw new NotFoundException('User not found');
    if (user.isEmailVerified) throw new BadRequestException('Email already verified');

    // Check lock
    if (user.otpLockUntil && new Date() < new Date(user.otpLockUntil)) {
      const minutesLeft = Math.ceil(
        (new Date(user.otpLockUntil).getTime() - Date.now()) / 60000,
      );
      throw new ForbiddenException(
        `Too many attempts. Try again in ${minutesLeft} minutes.`,
      );
    }

    if (!user.otp || !user.otpExpires) {
      throw new BadRequestException('No OTP found. Please request a new one.');
    }

    if (isOtpExpired(user.otpExpires)) {
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }

    const isMatch = await bcrypt.compare(dto.otp, user.otp);
    if (!isMatch) {
      const attempts = (user.otpAttempts || 0) + 1;
      if (attempts >= MAX_OTP_ATTEMPTS) {
        await this.userRepository.updateById(user._id.toString(), {
          otpAttempts: 0,
          otpLockUntil: getOtpExpiry(OTP_LOCK_MINUTES),
        });
        throw new ForbiddenException(
          `Too many failed attempts. Account locked for ${OTP_LOCK_MINUTES} minutes.`,
        );
      }
      await this.userRepository.updateById(user._id.toString(), {
        otpAttempts: attempts,
      });
      throw new BadRequestException(`Invalid OTP. ${MAX_OTP_ATTEMPTS - attempts} attempts remaining.`);
    }

    await this.userRepository.updateById(user._id.toString(), {
      isEmailVerified: true,
      otp: null,
      otpExpires: null,
      otpAttempts: 0,
      otpLockUntil: null,
    });

    return { message: 'Email verified successfully. You can now login.' };
  }

  // ─── Resend OTP ──────────────────────────────────────────────
  async resendOtp(dto: ResendOtpDto) {
    const user = await this.userRepository.findByEmail(
      dto.email,
      '+otpLockUntil',
    );

    if (!user) throw new NotFoundException('User not found');
    if (user.isEmailVerified) throw new BadRequestException('Email already verified');

    if (user.otpLockUntil && new Date() < new Date(user.otpLockUntil)) {
      const minutesLeft = Math.ceil(
        (new Date(user.otpLockUntil).getTime() - Date.now()) / 60000,
      );
      throw new ForbiddenException(`Too many attempts. Try again in ${minutesLeft} minutes.`);
    }

    const otp = generateOtp();
    const otpExpires = getOtpExpiry(10);
    const hashedOtp = await bcrypt.hash(otp, 10);

    await this.userRepository.updateById(user._id.toString(), {
      otp: hashedOtp,
      otpExpires,
      otpAttempts: 0,
    });

    await sendMail({
      to: dto.email,
      subject: 'New OTP - BrandHive',
      html: otpEmailTemplate(otp, 'verify'),
    });

    return { message: 'New OTP sent to your email.' };
  }

  // ─── Login ───────────────────────────────────────────────────
  async login(dto: LoginDto) {
    const user = await this.userRepository.findByEmail(dto.email, '+password');

    if (!user) throw new UnauthorizedException('Invalid email or password');

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid email or password');

    if (!user.isEmailVerified) {
      throw new ForbiddenException('Please verify your email before logging in');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Your account has been deactivated');
    }

    const tokens = await this.generateTokens(user._id.toString(), user.role);

    // Save hashed refresh token
    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);
    await this.userRepository.updateById(user._id.toString(), {
      refreshToken: hashedRefreshToken,
    });

    return {
      message: 'Login successful',
      ...tokens,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        avatar: user.avatar,
        phone: user.phone,
      },
    };
  }

  // ─── Logout ──────────────────────────────────────────────────
  async logout(userId: string) {
    await this.userRepository.updateById(userId, { refreshToken: null });
    return { message: 'Logged out successfully' };
  }

  // ─── Refresh Token ───────────────────────────────────────────
  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.userRepository.findById(userId, '+refreshToken');

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Access Denied');
    }

    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );

    if (!refreshTokenMatches) {
      throw new UnauthorizedException('Access Denied');
    }

    const tokens = await this.generateTokens(user._id.toString(), user.role);
    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);

    await this.userRepository.updateById(user._id.toString(), {
      refreshToken: hashedRefreshToken,
    });

    return tokens;
  }

  // ─── Forget Password ─────────────────────────────────────────
  async forgetPassword(dto: ForgetPasswordDto) {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) throw new NotFoundException('No user found with this email');

    const otp = generateOtp();
    const otpExpires = getOtpExpiry(10);
    const hashedOtp = await bcrypt.hash(otp, 10);

    await this.userRepository.updateById(user._id.toString(), {
      resetPasswordOtp: hashedOtp,
      resetPasswordOtpExpires: otpExpires,
      resetPasswordVerified: false,
    });

    await sendMail({
      to: dto.email,
      subject: 'Reset Your Password - BrandHive',
      html: otpEmailTemplate(otp, 'reset'),
    });

    return { message: 'Password reset OTP sent to your email.' };
  }

  // ─── Verify Reset Code ────────────────────────────────────────
  async verifyResetCode(dto: VerifyResetCodeDto) {
    const user = await this.userRepository.findByEmail(
      dto.email,
      '+resetPasswordOtp +resetPasswordOtpExpires',
    );

    if (!user) throw new NotFoundException('User not found');

    if (!user.resetPasswordOtp || !user.resetPasswordOtpExpires) {
      throw new BadRequestException('No reset code found. Please request a new one.');
    }

    if (isOtpExpired(user.resetPasswordOtpExpires)) {
      throw new BadRequestException('Reset code has expired. Please request a new one.');
    }

    const isMatch = await bcrypt.compare(dto.otp, user.resetPasswordOtp);
    if (!isMatch) throw new BadRequestException('Invalid reset code');

    await this.userRepository.updateById(user._id.toString(), {
      resetPasswordVerified: true,
    });

    return { message: 'Reset code verified. You can now reset your password.' };
  }

  // ─── Reset Password ───────────────────────────────────────────
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userRepository.findByEmail(
      dto.email,
      '+resetPasswordVerified +resetPasswordOtp',
    );

    if (!user) throw new NotFoundException('User not found');

    if (!user.resetPasswordVerified) {
      throw new ForbiddenException('Please verify your reset code first');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);

    await this.userRepository.updateById(user._id.toString(), {
      password: hashedPassword,
      resetPasswordOtp: null,
      resetPasswordOtpExpires: null,
      resetPasswordVerified: false,
      refreshToken: null, // Invalidate all sessions
    });

    return { message: 'Password reset successfully. Please login with your new password.' };
  }

  // ─── Change Password ──────────────────────────────────────────
  async changePassword(userId: string, dto: UpdatePasswordDto) {
    const user = await this.userRepository.findById(userId, '+password');
    if (!user) throw new NotFoundException('User not found');

    const isOldPasswordValid = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new BadRequestException('Old password is incorrect');
    }

    if (dto.oldPassword === dto.newPassword) {
      throw new BadRequestException('New password must be different from old password');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);

    await this.userRepository.updateById(userId, {
      password: hashedPassword,
      refreshToken: null, // Invalidate all sessions
    });

    return { message: 'Password changed successfully. Please login again.' };
  }

  // ─── Get Profile ─────────────────────────────────────────────
  async getProfile(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ─── Helpers ──────────────────────────────────────────────────
private async generateTokens(userId: string, role: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, role },
        {
          secret: process.env.JWT_SECRET,
          expiresIn: process.env.JWT_EXPIRES || '15m' as any,
        },
      ),
      this.jwtService.signAsync(
        { sub: userId, role },
        {
          secret: process.env.JWT_REFRESH_SECRET,
          expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' as any,
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }
}