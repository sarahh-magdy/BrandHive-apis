import { IsString, IsEmail, IsNotEmpty, IsDate, MinLength, MaxLength, IsOptional } from "class-validator";
import { Transform } from "class-transformer";

export class RegisterDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    @MaxLength(20)
    userName: string;
    
    @IsEmail()
    @IsNotEmpty()
    email: string;
    
    @IsString()
    @IsNotEmpty()
    password: string;   

    @Transform(({ value }) => {return new Date(value);})   
    @IsDate()
    dob: Date;
    
    @IsString()
    @IsOptional()
    role: string;
}

