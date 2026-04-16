import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRepository } from '@models/index';
import { ConfigService } from '@nestjs/config';
import { User } from '@models/index';
import { sendMail } from '@common/helpers';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  // REGISTER
  async register(user: User) {
    const exist = await this.userRepository.getOne({ email: user.email });

    if (exist) {
      throw new ConflictException('User already exists');
    }

    const created = await this.userRepository.create(user);

    await sendMail({
      from: this.configService.get('EMAIL_USER'),
      to: user.email,
      subject: 'Confirm your email - Brand Hive',
      html: `<h3>Your OTP is: ${user.otp}</h3>`,
    });

    const { password, otp, otpExpiry, ...safeUser } =
      JSON.parse(JSON.stringify(created));

    return {
      message: 'Registered successfully',
      data: safeUser,
    };
  }

  // CONFIRM EMAIL
  async confirmEmail(email: string, otp: string) {
    const user = await this.userRepository.getOne({ email });

    if (!user) throw new UnauthorizedException('User not found');

    if (user.otp !== otp || new Date() > user.otpExpiry) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    await this.userRepository.update(
      { email },
      { isVerified: true, otp: null, otpExpiry: null },
    );

    const token = this.jwtService.sign({
      _id: user._id,
      role: user.role,
      email: user.email,
    });

    return {
      message: 'Email confirmed successfully',
      token,
    };
  }

  // LOGIN
  async login(loginDto: LoginDto) {
    const user = await this.userRepository.getOne({
      email: loginDto.email,
    });

    if (!user) {
      throw new UnauthorizedException('User does not exist');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException('Please verify your email first');
    }

    const match = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!match) {
      throw new UnauthorizedException('Invalid password');
    }

    const token = this.jwtService.sign({
      _id: user._id,
      role: user.role,
      email: user.email,
    });

    return token;
  }

  // LOGOUT
  async logout(token: string) {
    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  // FORGOT PASSWORD
  async forgotPassword(email: string) {
    const user = await this.userRepository.getOne({ email });

    if (!user) {
      throw new UnauthorizedException(
        'If this email exists, an OTP has been sent.',
      );
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await this.userRepository.update(
      { email },
      { otp, otpExpiry },
    );

    await sendMail({
      from: this.configService.get('EMAIL_USER'),
      to: email,
      subject: 'Reset Password - Brand Hive',
      html: `<h3>Your reset OTP is: <b>${otp}</b></h3>`,
    });

    return { message: 'Reset code sent successfully' };
  }

  // VERIFY RESET CODE
  async verifyResetCode(email: string, otp: string) {
    const user = await this.userRepository.getOne({ email });

    if (!user || user.otp !== otp || new Date() > user.otpExpiry) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    return {
      message: 'OTP is valid. You can now reset your password.',
    };
  }

  // RESET PASSWORD
  async resetPassword(email: string, otp: string, newPass: string) {
    const user = await this.userRepository.getOne({ email });

    if (!user || user.otp !== otp || new Date() > user.otpExpiry) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const hashedPass = await bcrypt.hash(newPass, 10);

    await this.userRepository.update(
      { email },
      { password: hashedPass, otp: null, otpExpiry: null },
    );

    return { message: 'Password reset successfully' };
  }

  // UPDATE PASSWORD
  async updateLoggedUserPassword(
    userId: string,
    oldPass: string,
    newPass: string,
  ) {
    const user = await this.userRepository.getOne({ _id: userId });

    const isMatch = await bcrypt.compare(oldPass, user?.password || '');

    if (!isMatch) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedPass = await bcrypt.hash(newPass, 10);

    await this.userRepository.update(
      { _id: userId },
      { password: hashedPass },
    );

    return { message: 'Password updated successfully' };
  }

  // UPDATE PROFILE
  async updateLoggedUserData(
    userId: string,
    updateData: Partial<User>,
  ) {
    const { password, otp, otpExpiry, ...cleanData } =
      updateData as any;

    const updatedUser = await this.userRepository.update(
      { _id: userId },
      cleanData,
    );

    if (!updatedUser) {
      throw new UnauthorizedException('User not found');
    }

    return {
      message: 'Profile updated successfully',
      data: updatedUser,
    };
  }

  // MAKE ADMIN
  async makeAdmin(userId: string) {
    return await this.userRepository.update(
      { _id: userId },
      { role: 'admin' },
    );
  }

  // MAKE SELLER
  async makeSeller(userId: string) {
    return await this.userRepository.update(
      { _id: userId },
      { role: 'seller' },
    );
  }
}