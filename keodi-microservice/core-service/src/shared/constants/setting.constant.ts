export const SEARCH_RADIUS_KM_MAP: Record<string, number> = {
  KM_2: 2,
  KM_5: 5,
  KM_10: 10,
  KM_20: 20,
};

export const getSearchRadiusKm = (radius: string | undefined): number => {
  if (!radius) return 5;
  return SEARCH_RADIUS_KM_MAP[radius] ?? 5;
};
