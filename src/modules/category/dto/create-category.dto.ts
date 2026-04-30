
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested
} from "class-validator";
import { Type } from "class-transformer";
import { LogoDto } from "./logo.dto";

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LogoDto)
  logo?: LogoDto;
}