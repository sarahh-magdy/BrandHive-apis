import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RejectBrandDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  rejectionReason: string;
}