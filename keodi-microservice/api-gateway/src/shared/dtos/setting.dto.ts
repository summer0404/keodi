import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import {
  ProfileVisibility,
  SearchRadius,
  MinRating,
  AppLanguage,
} from '../enums/setting.enum';

export class UserSettingsDto {
  @ApiProperty({ example: true })
  shareLocation: boolean;

  @ApiProperty({ enum: ProfileVisibility, example: ProfileVisibility.PUBLIC })
  profileVisibility: ProfileVisibility;

  @ApiProperty({ example: true })
  notifyGroupInvites: boolean;

  @ApiProperty({ example: true })
  notifyVotingResults: boolean;

  @ApiProperty({ example: true })
  notifyNearbyPlaces: boolean;

  @ApiProperty({ example: true })
  notifyRecommendations: boolean;

  @ApiProperty({ enum: SearchRadius, example: SearchRadius.KM_5 })
  defaultSearchRadius: SearchRadius;

  @ApiProperty({ enum: MinRating, example: MinRating.ABOVE_3 })
  defaultMinRating: MinRating;

  @ApiProperty({ enum: AppLanguage, example: AppLanguage.VI })
  language: AppLanguage;

  @ApiProperty({ example: false })
  darkMode: boolean;
}

export class UpdateUserSettingDto {
  @IsOptional()
  @IsBoolean()
  @ApiProperty({ example: true, required: false })
  shareLocation?: boolean;

  @IsOptional()
  @IsEnum(ProfileVisibility)
  @ApiProperty({ enum: ProfileVisibility, required: false })
  profileVisibility?: ProfileVisibility;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ example: true, required: false })
  notifyGroupInvites?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ example: true, required: false })
  notifyVotingResults?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ example: true, required: false })
  notifyNearbyPlaces?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ example: true, required: false })
  notifyRecommendations?: boolean;

  @IsOptional()
  @IsEnum(SearchRadius)
  @ApiProperty({ enum: SearchRadius, required: false })
  defaultSearchRadius?: SearchRadius;

  @IsOptional()
  @IsEnum(MinRating)
  @ApiProperty({ enum: MinRating, required: false })
  defaultMinRating?: MinRating;

  @IsOptional()
  @IsEnum(AppLanguage)
  @ApiProperty({ enum: AppLanguage, required: false })
  language?: AppLanguage;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ example: false, required: false })
  darkMode?: boolean;
}
