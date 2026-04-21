import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum DevicePlatformDto {
  IOS = 'IOS',
  ANDROID = 'ANDROID',
}

export class UpsertDeviceTokenDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example:
      'fCM_DEVICE_TOKEN_EXAMPLE',
    description: 'Firebase Cloud Messaging device token',
  })
  token: string;

  @IsEnum(DevicePlatformDto)
  @ApiProperty({
    enum: DevicePlatformDto,
    example: DevicePlatformDto.IOS,
  })
  platform: DevicePlatformDto;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'iphone-15-pro',
    required: false,
    description: 'Client-side device identifier',
  })
  deviceId?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: '1.0.0',
    required: false,
    description: 'Application version currently installed on the device',
  })
  appVersion?: string;
}