import { ApiProperty, PickType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ProfileVisibility } from '../enums/setting.enum';
import { Role } from '../enums/role.enum';

export class CreateUserDto {
  @IsNotEmpty({ message: 'Username is required' })
  @IsString({ message: 'Username must be a string' })
  @MaxLength(20, { message: 'Username must not exceed 20 characters' })
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @Matches(/^(?!\d+$)[A-Za-z0-9._]+$/, {
    message:
      'Username can only contain letters, numbers, underscores, and dots, and cannot be only numbers',
  })
  @ApiProperty({
    example: '_Abc123.example',
    description:
      'Login username (3–20 chars, only letters, numbers, underscores, dots, not only numbers, case-insensitive)',
  })
  username: string;

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
  password: string;

  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email format' })
  @ApiProperty({ example: 'hello@example.com', description: 'User email' })
  email: string;
}

export class UpdateUsernameDto extends PickType(CreateUserDto, [
  'username',
] as const) {}

export class CurrentUserDto {
  @ApiProperty({ example: 'clq2k3s9f000001l6gms61932', description: 'User ID' })
  id: string;

  @ApiProperty({ example: '_Abc123.example', description: 'Username' })
  username: string;

  @ApiProperty({ example: '', description: 'Email' })
  email: string;

  @ApiProperty({ enum: Role, example: Role.USER, description: 'User role' })
  role: Role;
}

export class UpdateUserProfileDto {
  @IsOptional()
  @IsString({ message: 'First name must be a string' })
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  @ApiProperty({
    example: 'John',
    description: 'First name of the user (max 50 characters)',
  })
  firstName?: string;

  @IsOptional()
  @IsString({ message: 'Last name must be a string' })
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  @ApiProperty({
    example: 'Doe',
    description: 'Last name of the user (max 50 characters)',
  })
  lastName?: string;

  @IsOptional()
  @IsString({ message: 'Phone number must be a string' })
  @MaxLength(12, { message: 'Phone number must not exceed 12 characters' })
  @ApiProperty({
    example: '+1234567890',
    description: 'Phone number of the user (max 12 characters)',
  })
  phoneNumber?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Date of birth must be a valid date' })
  @ApiProperty({
    example: '1990-01-01',
    description: 'Date of birth of the user (YYYY-MM-DD format)',
  })
  dateOfBirth?: Date;
}

export class UpdateLocationDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  @ApiProperty({ example: 10.76407, description: 'User latitude' })
  latitude: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  @ApiProperty({ example: 106.67838, description: 'User longitude' })
  longitude: number;
}

export class UserBasicResponseDto {
  @ApiProperty({ example: 'clq2k3s9f000001l6gms61932' })
  id: string;

  @ApiProperty({ example: 'John', nullable: true })
  firstName: string | null;

  @ApiProperty({ example: 'Doe', nullable: true })
  lastName: string | null;

  @ApiProperty({ example: '+1234567890', nullable: true })
  phoneNumber: string | null;

  @ApiProperty({ example: 'https://example.com/avatar.png', nullable: true })
  pictureUrl: string | null;
}

export class OtherUserProfileResponseDto extends UserBasicResponseDto {
  @ApiProperty({ example: '1990-01-01T00:00:00.000Z', nullable: true })
  dateOfBirth: Date | null;

  @ApiProperty({
    enum: ProfileVisibility,
    example: ProfileVisibility.FRIENDS_ONLY,
  })
  profileVisibility: ProfileVisibility;

  @ApiProperty({ example: false })
  isProfileVisible: boolean;

  @ApiProperty({ example: false })
  isFriend: boolean;

  @ApiProperty({ example: true })
  hasPendingRequest: boolean;

  @ApiProperty({ example: false })
  canSendFriendRequest: boolean;
}

export class UserMessageResponseDto {
  @ApiProperty({ example: 'Profile updated successfully' })
  message: string;
}
