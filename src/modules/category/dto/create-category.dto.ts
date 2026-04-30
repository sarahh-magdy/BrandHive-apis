
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested
} from "class-validator";
import { Type } from "class-transformer";

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name: string;

}