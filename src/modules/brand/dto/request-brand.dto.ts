import {
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';

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

  // ─── NEW: مطلوب عشان لما الـ request يتـ approve يتعمل seller account
  // الـ whatsappLink بيبقى جزء من الـ seller profile
  @IsString()
  @IsNotEmpty()
  whatsappLink: string;
}