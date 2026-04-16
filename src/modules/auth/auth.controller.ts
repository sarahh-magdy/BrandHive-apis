import { Controller, Post, Body, Get, Patch, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { AuthFactoryService } from './factory';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { Public } from '../../common/decorators/public.decorator';
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authFactoryService: AuthFactoryService
  ) {}

//REGISTER
  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    const customer = await this.authFactoryService.createCustomer(registerDto);
    const createdCustomer = await this.authService.register(customer);
    return { message: 'Customer registered successfully', success: true, data: createdCustomer };
  }

//CONFIRM EMAIL
  @Public()
  @Post('confirm-email')
  @HttpCode(HttpStatus.OK)
  async confirmEmail(@Body() body: { email: string; otp: string }) {
    const result = await this.authService.confirmEmail(body.email, body.otp);
    return { success: true, ...result };
  }

//LOGIN
  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const token = await this.authService.login(loginDto);
    return { message: 'Customer logged in successfully', success: true, data: { token } };
  }

//LOGOUT
  @Public()
  @Post('logout')
  @UseGuards(AuthGuard) 
  async logout(@Req() req) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    return this.authService.logout(token);
  }

//FORGOT PASSWORD
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body('email') email: string) {
    return await this.authService.forgotPassword(email);
  }

//VERIFY RESET CODE
  @Public()
  @Post('verify-reset-code')
  @HttpCode(HttpStatus.OK)
  async verifyResetCode(@Body() body: { email: string; otp: string }) {
    return await this.authService.verifyResetCode(body.email, body.otp);
  }

//RESET PASSWORD
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return await this.authService.resetPassword(
      resetPasswordDto.email,
      resetPasswordDto.otp,
      resetPasswordDto.newPass
    );
  }

//UPDATE PASSWORD
  @Patch('update-password')
  @UseGuards(AuthGuard)
  async updatePassword(@Req() req, @Body() body: { oldPass: string; newPass: string }) {
    return await this.authService.updateLoggedUserPassword(req.user._id, body.oldPass, body.newPass);
  }

//UPDATE PROFILE
  @Patch('update-profile')
  @UseGuards(AuthGuard)
  async updateProfile(@Req() req, @Body() updateData: any) {
    return await this.authService.updateLoggedUserData(req.user._id, updateData);
  }

//GET ALL USERS 
  @Get('users')
  @UseGuards(AuthGuard)
  async getAllUsers() {
    return { message: "This would return all users (Admin only logic)" };
  }
}