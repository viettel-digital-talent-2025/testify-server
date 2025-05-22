import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: 'First name of the user',
    example: 'Khang',
  })
  @IsNotEmpty()
  @IsString()
  firstname: string;

  @ApiProperty({
    description: 'Last name of the user',
    example: 'Nguyen',
  })
  @IsNotEmpty()
  @IsString()
  lastname: string;

  @ApiProperty({
    description: 'Email of the user',
    example: 'khang@gmail.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Password of the user',
    example: 'khang2004',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;
}

export class ResgisterResponseDto {}

export class LoginDto {
  @ApiProperty({
    description: 'Email of the user',
    example: 'khang@gmail.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Password of the user',
    example: 'khang2004',
  })
  @IsNotEmpty()
  @IsString()
  password: string;
}
