import { IsNotEmpty, IsOptional, IsString, MinLength, IsObject } from "class-validator";

export class CreateCategoryDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    name: string;
    
    // TODO: Add validation for logo
    @IsOptional()
    @IsObject()
    logo: Record<string, any>;
}
