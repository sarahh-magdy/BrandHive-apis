import {
  Controller,
  Post,
  Body,
  Patch,
  Get,
  Req,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ConfirmEmailDto } from './dto/confirm-email.dto';
import { AuthFactoryService } from './factory';
import { AuthGuard } from '@common/guards/auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Public } from '@common/decorators/public.decorator';
import { Roles } from '@common/decorators/roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authFactoryService: AuthFactoryService,
  ) {}

  //  REGISTER 
  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    const user = await this.authFactoryService.createUser(registerDto);
    return await this.authService.register(user);
  }

  // CONFIRM EMAIL 
  @Public()
  @Post('confirm-email')
  @HttpCode(HttpStatus.OK)
  async confirmEmail(@Body() dto: ConfirmEmailDto) {
    return await this.authService.confirmEmail(dto.email, dto.otp);
  }

  // LOGIN
  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const token = await this.authService.login(loginDto);
    return {
      message: 'Logged in successfully',
      data: { token },
    };
  }

  // LOGOUT
  @Post('logout')
  @UseGuards(AuthGuard)
  async logout(@Req() req) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    return await this.authService.logout(token);
  }

  // FORGOT PASSWORD
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body('email') email: string) {
    return await this.authService.forgotPassword(email);
  }

  // VERIFY RESET CODE
  @Public()
  @Post('verify-reset-code')
  @HttpCode(HttpStatus.OK)
  async verifyResetCode(@Body() body: { email: string; otp: string }) {
    return await this.authService.verifyResetCode(
      body.email,
      body.otp,
    );
  }

  // RESET PASSWORD
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return await this.authService.resetPassword(
      resetPasswordDto.email,
      resetPasswordDto.otp,
      resetPasswordDto.newPass,
    );
  }

  // UPDATE PASSWORD
  @Patch('update-password')
  @UseGuards(AuthGuard)
  async updatePassword(
    @Req() req,
    @Body() body: { oldPass: string; newPass: string },
  ) {
    return await this.authService.updateLoggedUserPassword(
      req.user._id,
      body.oldPass,
      body.newPass,
    );
  }

  // UPDATE PROFILE
  @Patch('update-profile')
  @UseGuards(AuthGuard)
  async updateProfile(@Req() req, @Body() updateData: any) {
    return await this.authService.updateLoggedUserData(
      req.user._id,
      updateData,
    );
  }

  // GET USERS (ADMIN ONLY)
  @Get('users')
  @UseGuards(AuthGuard, RolesGuard)
@Roles(['admin'])
  async getAllUsers() {
    return { message: 'Only admin can access this' };
  }

  // MAKE ADMIN
  @Patch('make-admin/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(['admin'])
  async makeAdmin(@Param('id') id: string) {
    return await this.authService.makeAdmin(id);
  }

  // APPROVE SELLER
  @Patch('make-seller/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(['admin'])
  async makeSeller(@Param('id') id: string) {
    return await this.authService.makeSeller(id);
  }
}