import {
  AppLanguage,
  MinRating,
  ProfileVisibility,
  SearchRadius,
} from '../enums/setting.enum';

export const DEFAULT_USER_SETTINGS = {
  shareLocation: true,
  profileVisibility: ProfileVisibility.PUBLIC,
  notifyGroupInvites: true,
  notifyVotingResults: true,
  notifyNearbyPlaces: true,
  notifyRecommendations: true,
  defaultSearchRadius: SearchRadius.KM_5,
  defaultMinRating: MinRating.ABOVE_3,
  language: AppLanguage.VI,
  darkMode: false,
};
