import {
  Controller,
  Post,
  Body,
  Patch,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { RegisterDto } from './dto/register.dto';
import { ConfirmEmailDto } from './dto/confirm-email.dto';
import { Public } from '@common/decorators/public.decorator';
import { Auth } from '@common/decorators/auth.decorator';
import { User } from '@common/decorators/user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── REGISTER ─────────────────────────────────────────────────
  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    const result = await this.authService.register(registerDto);
    return {
      success: true,
      message: 'Registration successful. Please check your email for OTP.',
      data: result,
    };
  }

  // ─── CONFIRM EMAIL ────────────────────────────────────────────
  @Public()
  @Post('confirm-email')
  @HttpCode(HttpStatus.OK)
  // ✅ استخدمنا ConfirmEmailDto بدل raw body عشان validation يشتغل
  async confirmEmail(@Body() body: ConfirmEmailDto) {
    return this.authService.confirmEmail(body.email, body.otp);
  }

  // ─── RESEND OTP ───────────────────────────────────────────────
  @Public()
  @Post('resend-otp')
  async resendOtp(@Body('email') email: string) {
    return this.authService.resendOtp(email);
  }

  // ─── LOGIN ────────────────────────────────────────────────────
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    const token = await this.authService.login(loginDto);
    return {
      success: true,
      message: 'Logged in successfully',
      data: { token },
    };
  }

  // ─── LOGOUT ───────────────────────────────────────────────────
  // ✅ استخدمنا @Auth بدل @UseGuards عشان يكون consistent مع باقي الكود
  @Post('logout')
  @Auth(['Customer', 'Seller', 'Admin'])
  @HttpCode(HttpStatus.OK)
  async logout(@User('token') token: string) {
    return this.authService.logout(token);
  }

  // ─── FORGOT PASSWORD ──────────────────────────────────────────
  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  // ─── VERIFY RESET CODE ────────────────────────────────────────
  @Public()
  @Post('verify-reset-code')
  @HttpCode(HttpStatus.OK)
  async verifyResetCode(@Body() body: ConfirmEmailDto) {
    return this.authService.verifyResetCode(body.email, body.otp);
  }

  // ─── RESET PASSWORD ───────────────────────────────────────────
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.email, dto.otp, dto.newPass);
  }

  // ─── UPDATE PASSWORD ──────────────────────────────────────────
  // ✅ استخدمنا @Auth و @User decorator بدل @UseGuards و @Req
  @Patch('update-password')
  @Auth(['Customer', 'Seller', 'Admin'])
  async updatePassword(
    @User('_id') userId: string,
    @User('role') role: string,
    @Body() dto: UpdatePasswordDto,
  ) {
    return this.authService.updateLoggedUserPassword(
      userId,
      dto.oldPass,
      dto.newPass,
      role,
    );
  }

  // ─── UPDATE PROFILE ───────────────────────────────────────────
  @Patch('update-profile')
  @Auth(['Customer', 'Seller', 'Admin'])
  async updateProfile(
    @User('_id') userId: string,
    @User('role') role: string,
    @Body() updateData: any,
  ) {
    return this.authService.updateLoggedUserData(userId, updateData, role);
  }
}