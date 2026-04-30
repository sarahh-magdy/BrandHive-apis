import { IsNotEmpty, IsString } from "class-validator";

export class LogoDto {
  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsNotEmpty()
  publicId: string;
}