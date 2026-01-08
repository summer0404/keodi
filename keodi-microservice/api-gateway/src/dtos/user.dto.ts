import { ApiProperty, PickType } from "@nestjs/swagger"
import {
    IsEmail,
    IsNotEmpty,
    IsString,
    Matches,
    MaxLength,
    MinLength
} from "class-validator"

export class CreateUserDto {
    @IsNotEmpty({ message: 'Username is required' })
    @IsString({ message: 'Username must be a string' })
    @MaxLength(20, { message: 'Username must not exceed 20 characters' })
    @MinLength(3, { message: 'Username must be at least 3 characters long' })
    @Matches(/^(?!\d+$)[A-Za-z0-9._]+$/, {
        message: 'Username can only contain letters, numbers, underscores, and dots, and cannot be only numbers'
    })
    @ApiProperty({
        example: '_Abc123.example',
        description: 'Login username (3–20 chars, only letters, numbers, underscores, dots, not only numbers, case-insensitive)'
    })
    username: string;


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
    password: string


    @IsNotEmpty({ message: 'Email is required' })
    @IsEmail({}, { message: 'Invalid email format' })
    @ApiProperty({ example: 'hello@example.com', description: 'User email' })
    email: string
}

export class UpdateUsernameDto extends PickType(CreateUserDto, ['username'] as const) {}

export class CurrentUserDto {
    @ApiProperty({ example: 1, description: 'User ID' })
    id: number;

    @ApiProperty({ example: '_Abc123.example', description: 'Username' })
    username: string;

    @ApiProperty({ example: '', description: 'Email' })
    email: string;
}