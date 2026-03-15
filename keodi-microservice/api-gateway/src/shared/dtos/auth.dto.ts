import { ApiProperty, PickType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CreateUserDto } from './user.dto';

export class RegisterDto extends CreateUserDto {}

export class LoginDto extends PickType(RegisterDto, [
  'username',
  'password',
] as const) {
  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}

export class ForgotPasswordOTPDto extends PickType(RegisterDto, [
  'email',
] as const) {}

export class ResetPasswordOTPDto extends ForgotPasswordOTPDto {}

export class ValidateOTPDto {
  @ApiProperty({
    example: 'clq2k3s9f000001l6gms61932',
    description: 'ID of the user requesting password reset',
  })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty({
    example: '123456',
    description: '6-digit OTP sent to user via email',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(6)
  @MinLength(6)
  @Matches(/^[0-9]+$/, {
    message: 'OTP must be a 6-digit number',
  })
  otp: string;
}

export class ResendVerifyEmailDto extends PickType(RegisterDto, ['email']) {}

export class ResetPasswordDto {
  @IsNotEmpty({ message: 'Password is required' })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/.*[A-Z].*/, {
    message: 'Password must contain at least one uppercase letter',
  })
  @Matches(/.*\d.*/, { message: 'Password must contain at least one number' })
  @Matches(/.*[@$!%*?&^+#].*/, {
    message: 'Password must contain at least one special character',
  })
  @ApiProperty({
    example: 'Abc123!@#',
    description:
      'Password (minimum 8 characters, must include at least 1 uppercase letter, 1 number, and 1 special character)',
  })
  newPassword: string;
}

export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6...',
    description: 'JWT - access token',
  })
  accessToken: string;
}

export class ResetPasswordResponseDto {
  @ApiProperty({
    example: 'Password reset successfully',
    description: 'Valid OTP',
  })
  message: string;
}

export class RegisterOkResponseDto {
  @ApiProperty({ example: 'User created successfully' })
  message: string;

  @ApiProperty({ example: 'abcdXYZ123' })
  userId: string;
}

export class UnverifiedAccountResponse {
  @ApiProperty({ example: 'Your account has not verifed' })
  message: string;

  @ApiProperty({ example: 'userId used for resend verify email' })
  data: { userId: string };
}

export class ValidateForgotPasswordOTPResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6...',
    description: 'JWT - access token',
  })
  resetToken: string;
}

export class ValidateResetPasswordOTPResponseDto extends ValidateForgotPasswordOTPResponseDto {}

export class ForgotPasswordOTPResponseDto {
  @ApiProperty({
    example: 4,
    description:
      'Indicates if the reset email was sent successfully and used to verify OTP',
  })
  userId: string;
}

export class ResetPasswordOTPResponseDto extends ForgotPasswordOTPResponseDto {}

export class MeResponseDto {
  @ApiProperty({ example: 1, description: 'User ID' })
  id: string;

  @ApiProperty({ example: 'johndoe', description: 'Username' })
  username: string;

  @ApiProperty({ example: 'user@example.comn', description: 'Email address' })
  email: string;

  @ApiProperty({ example: 'John', description: 'First name' })
  firstName: string | null;

  @ApiProperty({ example: 'Doe', description: 'Last name' })
  lastName: string | null;

  @ApiProperty({
    example: 'https://example.com/profile.jpg',
    description: 'Profile picture URL',
    nullable: true,
  })
  picture: string | null;

  @ApiProperty({ example: '1990-01-01', description: "user's date of birth" })
  dateOfBirth: Date | null;

  @ApiProperty({
    example: '+1234567890',
    description: "user's phone number",
    nullable: true,
  })
  phoneNumber: string | null;
}


export class GoogleLoginMobileDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6...',
    description: 'Google access token from client',
  })
  @IsNotEmpty()
  @IsString()
  token: string;
}