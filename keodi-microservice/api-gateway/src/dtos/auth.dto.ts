import { ApiProperty, PickType } from "@nestjs/swagger";
import { CreateUserDto } from "./user.dto";
import { IsInt, IsNotEmpty, IsString, IsUUID, Matches, MaxLength, MinLength } from "class-validator";
import { Type } from "class-transformer";

export class RegisterDto extends CreateUserDto { }

export class LoginDto extends PickType(RegisterDto, ['username', 'password'] as const) { }

export class ForgotPasswordDto extends PickType(RegisterDto, ['email'] as const) { }

export class ValidateOTPDto {
    @ApiProperty({
        example: 123,
        description: 'ID of the user requesting password reset',
    })
    @IsNotEmpty()
    @IsInt()
    @Type(() => Number)
    userId: number

    @ApiProperty({
        example: '123456',
        description: '6-digit OTP sent to user via email',
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(6)
    @MinLength(6)
    @Matches(/^[0-9]+$/, {
        message: 'OTP must be a 6-digit number'
    })
    otp: string
}

export class ResetPasswordDto {
    @IsNotEmpty({ message: 'Password is required' })
    @IsString({ message: 'Password must be a string' })
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @Matches(/.*[A-Z].*/, { message: 'Password must contain at least one uppercase letter' })
    @Matches(/.*\d.*/, { message: 'Password must contain at least one number' })
    @Matches(/.*[@$!%*?&^+].*/, { message: 'Password must contain at least one special character' })
    @ApiProperty({
        example: 'Abc123!@#',
        description: 'Password (minimum 8 characters, must include at least 1 uppercase letter, 1 number, and 1 special character)'
    })
    newPassword: string
}

export class AuthResponseDto {
    @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6...', description: 'JWT - access token' })
    accessToken: string
}

export class ResetPasswordResponseDto {
    @ApiProperty({ example: "Password reset successfully", description: 'Valid OTP' })
    message: string
}


export class ValidateForgotPasswordOTPResponseDto {
    @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6...', description: 'JWT - access token' })
    resetToken: string
}

export class ForgotPasswordResponseDto {
    @ApiProperty({ example: 4, description: 'Indicates if the reset email was sent successfully and used to verify OTP' })
    userId: number;
}