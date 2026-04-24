import { IsOptional, IsString } from 'class-validator';

export class ResendOtpDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}