import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
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
import { Public } from '../../common/decorators/public.decorator';
import { User } from '../../common/decorators/user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Roles } from '@common/decorators';
import { UserRole } from '@models/index';
import { RolesGuard } from '@common/guards';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /auth/register
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // POST /auth/confirm-email
  @Public()
  @Post('confirm-email')
  @HttpCode(HttpStatus.OK)
  confirmEmail(@Body() dto: ConfirmEmailDto) {
    return this.authService.confirmEmail(dto);
  }

  // POST /auth/resend-otp
  @Public()
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto);
  }

  // POST /auth/login
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // POST /auth/logout
  @UseGuards(AuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@User('_id') userId: string) {
    return this.authService.logout(userId.toString());
  }

  // POST /auth/refresh
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.userId, dto.refreshToken);
  }

  // POST /auth/forget-password
  @Public()
  @Post('forget-password')
  @HttpCode(HttpStatus.OK)
  forgetPassword(@Body() dto: ForgetPasswordDto) {
    return this.authService.forgetPassword(dto);
  }

  // POST /auth/verify-reset-code
  @Public()
  @Post('verify-reset-code')
  @HttpCode(HttpStatus.OK)
  verifyResetCode(@Body() dto: VerifyResetCodeDto) {
    return this.authService.verifyResetCode(dto);
  }

  // PATCH /auth/reset-password
  @Public()
  @Patch('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // PATCH /auth/change-password
  @UseGuards(AuthGuard)
  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  changePassword(
    @User('_id') userId: string,
    @Body() dto: UpdatePasswordDto,
  ) {
    return this.authService.changePassword(userId.toString(), dto);
  }

  // GET /auth/me
  @UseGuards(AuthGuard)
  @Get('me')
  getProfile(@User('_id') userId: string) {
    return this.authService.getProfile(userId.toString());
  }

  @Post('create-admin')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([UserRole.ADMIN])
  createAdmin(@Body() dto: RegisterDto) {
    return this.authService.createAdmin(dto);
  }
}