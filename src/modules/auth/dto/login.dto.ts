import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class LoginDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^(\S+@\S+\.\S+|01[0-2,5]{1}[0-9]{8})$/, {
    message: 'Enter valid email or Egyptian phone number',
  })
  identifier: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;
}