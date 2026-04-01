import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import {
  AppLanguage,
  MinRating,
  ProfileVisibility,
  SearchRadius,
} from '../enums/setting.enum';

export class UserSettingsDto {
  shareLocation: boolean;
  profileVisibility: ProfileVisibility;
  notifyGroupInvites: boolean;
  notifyVotingResults: boolean;
  notifyNearbyPlaces: boolean;
  notifyRecommendations: boolean;
  defaultSearchRadius: SearchRadius;
  defaultMinRating: MinRating;
  language: AppLanguage;
  darkMode: boolean;
}

export class UpdateUserSettingDto {
  @IsOptional()
  @IsBoolean()
  shareLocation?: boolean;

  @IsOptional()
  @IsEnum(ProfileVisibility)
  profileVisibility?: ProfileVisibility;

  @IsOptional()
  @IsBoolean()
  notifyGroupInvites?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyVotingResults?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyNearbyPlaces?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyRecommendations?: boolean;

  @IsOptional()
  @IsEnum(SearchRadius)
  defaultSearchRadius?: SearchRadius;

  @IsOptional()
  @IsEnum(MinRating)
  defaultMinRating?: MinRating;

  @IsOptional()
  @IsEnum(AppLanguage)
  language?: AppLanguage;

  @IsOptional()
  @IsBoolean()
  darkMode?: boolean;
}
