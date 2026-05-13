import {
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
  IsBoolean,
  IsPhoneNumber,
  isNotEmpty,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class RequestBrandDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  logo?: object;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  categories?: string[];


  @IsString()
  @IsOptional()
  whatsappLink?: string;


  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  shipsInternationally?: boolean;

  @IsNotEmpty()
  @IsString()
  city: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

}