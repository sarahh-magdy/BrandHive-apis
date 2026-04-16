import { IsEmail, IsNotEmpty, Matches } from "class-validator";

export class ConfirmEmailDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @Matches(/^\d{6}$/, {
    message: 'OTP must be 6 digits'
  })
  otp: string;
}