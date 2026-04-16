import { RegisterDto } from "../dto/register.dto";
import * as bcrypt from 'bcrypt';
import { generateOtp } from "src/common/helpers";
import { Injectable } from "@nestjs/common";
import { User } from "@models/index";

@Injectable()
export class AuthFactoryService {
  async createUser(registerDto: RegisterDto) {
    const user = new User();

    user.userName = registerDto.userName;
    user.email = registerDto.email;
    user.password = await bcrypt.hash(registerDto.password, 10);
    user.otp = generateOtp();
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    user.isVerified = false;
    user.dob = registerDto.dob;
    user.role = 'customer';

    return user;
  }
}