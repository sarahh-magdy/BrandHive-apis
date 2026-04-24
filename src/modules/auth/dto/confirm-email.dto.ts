import { IsOptional, IsString } from 'class-validator';

export class ConfirmEmailDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  otp: string;
}