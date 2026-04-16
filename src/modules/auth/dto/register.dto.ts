import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsDate,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(20)
  userName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @Transform(({ value }) => new Date(value))
  @IsDate()
  dob: Date;

  // ✅ role اتشالت خالص — Customer دايماً عند الـ register
  // منع أي حد يبعت role: 'admin' في الـ body
}