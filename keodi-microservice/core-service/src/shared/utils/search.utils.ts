import { SEARCH_RADIUS_KM_MAP } from '../constants/setting.constant';

export const getSearchRadiusKm = (radius: string | undefined): number => {
  if (!radius) return SEARCH_RADIUS_KM_MAP.KM_5;
  return SEARCH_RADIUS_KM_MAP[radius] ?? SEARCH_RADIUS_KM_MAP.KM_5;
};
