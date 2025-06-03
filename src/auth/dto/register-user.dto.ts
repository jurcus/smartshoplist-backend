// src/auth/dto/register-user.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterUserDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'User name',
    required: true,
  })
  @IsNotEmpty({ message: 'Name should not be empty' })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'john@example.com',
    description: 'User email address',
    required: true,
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email should not be empty' })
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'User password (min 6 characters)',
    required: true,
  })
  @IsNotEmpty({ message: 'Password should not be empty' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;
}
