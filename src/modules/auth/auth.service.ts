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

const OTP_LOCK_MINUTES = 15;
const MAX_OTP_ATTEMPTS = 5;
const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  // ───────────────────────── REGISTER ─────────────────────────
  async register(dto: RegisterDto) {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const otpExpires = getOtpExpiry(10);

    const user = await this.userRepository.create({
  name: dto.name,
  email: dto.email,
  password: hashedPassword,
  role: UserRole.CUSTOMER,
  otp: hashedOtp,
  otpExpires,
  isEmailVerified: false,
});

    try {
      await sendMail({
        to: dto.email,
        subject: 'Verify Your Email - BrandHive',
        html: otpEmailTemplate(otp, 'verify'),
      });
    } catch (err) {
      console.error('Register email failed:', err.message);
    }

    return {
      message: 'Registration successful. Please verify your email.',
      userId: user._id,
    };
  }

  // ───────────────────────── CONFIRM EMAIL ─────────────────────────
  async confirmEmail(dto: ConfirmEmailDto) {
    const user = await this.userRepository.findByEmail(
      dto.email,
      '+otp +otpExpires +otpAttempts +otpLockUntil',
    );

    if (!user) throw new NotFoundException('User not found');
    if (user.isEmailVerified)
      throw new BadRequestException('Email already verified');

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
      throw new BadRequestException('OTP expired. Please request new one.');
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
          `Too many attempts. Locked for ${OTP_LOCK_MINUTES} minutes.`,
        );
      }

      await this.userRepository.updateById(user._id.toString(), {
        otpAttempts: attempts,
      });

      throw new BadRequestException(
        `Invalid OTP. ${MAX_OTP_ATTEMPTS - attempts} attempts left.`,
      );
    }

    await this.userRepository.updateById(user._id.toString(), {
      isEmailVerified: true,
      otp: null,
      otpExpires: null,
      otpAttempts: 0,
      otpLockUntil: null,
    });

    return { message: 'Email verified successfully.' };
  }

  // ───────────────────────── RESEND OTP ─────────────────────────
  async resendOtp(dto: ResendOtpDto) {
    const user = await this.userRepository.findByEmail(
      dto.email,
      '+otpLockUntil',
    );

    if (!user) throw new NotFoundException('User not found');
    if (user.isEmailVerified)
      throw new BadRequestException('Email already verified');

    if (user.otpLockUntil && new Date() < new Date(user.otpLockUntil)) {
      const minutesLeft = Math.ceil(
        (new Date(user.otpLockUntil).getTime() - Date.now()) / 60000,
      );

      throw new ForbiddenException(
        `Try again in ${minutesLeft} minutes.`,
      );
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
      await sendMail({
        to: dto.email,
        subject: 'New OTP - BrandHive',
        html: otpEmailTemplate(otp, 'verify'),
      });
    } catch (err) {
      console.error('Resend OTP email failed:', err.message);
    }

    return { message: 'New OTP sent.' };
  }

  // ───────────────────────── LOGIN ─────────────────────────
  async login(dto: LoginDto) {
    const user = await this.userRepository.findByEmail(dto.email, '+password');

    if (!user)
      throw new UnauthorizedException('Invalid email or password');

    const isValid = await bcrypt.compare(dto.password, user.password);

    if (!isValid)
      throw new UnauthorizedException('Invalid email or password');

    if (!user.isEmailVerified)
      throw new ForbiddenException('Verify email first');

    if (!user.isActive)
      throw new ForbiddenException('Account deactivated');

    const tokens = await this.generateTokens(
      user._id.toString(),
      user.role,
    );

    const hashedRefresh = await bcrypt.hash(tokens.refreshToken, 10);

    await this.userRepository.updateById(user._id.toString(), {
      refreshToken: hashedRefresh,
    });

    return {
      message: 'Login successful',
      ...tokens,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  // ───────────────────────── LOGOUT ─────────────────────────
  async logout(userId: string) {
    await this.userRepository.updateById(userId, {
      refreshToken: null,
    });

    return { message: 'Logged out' };
  }

  // ───────────────────────── REFRESH ─────────────────────────
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

  // ───────────────────────── FORGET PASSWORD ─────────────────────────
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

  // ───────────────────────── VERIFY RESET ─────────────────────────
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

  // ───────────────────────── RESET PASSWORD ─────────────────────────
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

  // ───────────────────────── CHANGE PASSWORD ─────────────────────────
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

  // ───────────────────────── PROFILE ─────────────────────────
  async getProfile(userId: string) {
    const user = await this.userRepository.findById(userId);

    if (!user)
      throw new NotFoundException('User not found');

    return user;
  }

  // ───────────────────────── TOKENS ─────────────────────────
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
}