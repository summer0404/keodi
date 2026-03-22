export const sanitizeUsername = (text: string) => {
  return text
    .toLowerCase()
    .normalize('NFD') // Decompose combined characters
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/đ/g, 'd') // Handle khusus Vietnamese 'đ'
    .replace(/\s+/g, '') // Remove spaces
    .replace(/[^a-z0-9._]/g, ''); // Keep only alphanumeric, dots and underscores
};

export const extractWaitSeconds = (message?: string) => {
  if (!message) return null;
  const matched = message.match(/wait\s+(\d+)\s+seconds/i);
  if (!matched) return null;
  const seconds = Number(matched[1]);
  return Number.isNaN(seconds) ? null : seconds;
};

export const PLACES_DEFAULT_PAGE = 1;
export const PLACES_DEFAULT_LIMIT = 10;

// String utilities
export const toAsciiLower = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase();

// Address formatting utilities
export const cleanNumber = (value: string) => {
  const numeric = value.match(/^0*([0-9]+)$/);
  if (!numeric) return value;
  return String(Number(numeric[1]));
};

export const splitWardParts = (value: string) => {
  const rawParts = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (rawParts.length <= 1) {
    const compact = value.trim().replace(/\s+/g, ' ');
    const districtIndex = compact.search(/\b(district|quan|quận)\b/i);

    if (districtIndex > 0) {
      return {
        wardPart: compact.slice(0, districtIndex).trim(),
        districtPart: compact.slice(districtIndex).trim(),
      };
    }

    return {
      wardPart: compact,
      districtPart: '',
    };
  }

  return {
    wardPart: rawParts[0],
    districtPart: rawParts.slice(1).join(', '),
  };
};

export const getLocalizedLocation = (
  wardInput: string | null | undefined,
  cityInput: string | null | undefined,
  language: string,
  t: (key: string) => string
) => {
  const wardValue = wardInput?.trim() ?? '';
  const cityValue = cityInput?.trim() ?? '';

  let formattedWard = '';

  if (wardValue) {
    const { wardPart, districtPart } = splitWardParts(wardValue);
    const wardLabel = t('address.ward');
    const districtLabel = t('address.district');

    const normalizeWardName = (part: string) =>
      part.replace(/^\s*(ward|phuong|phường)\s*/i, '').trim();

    const normalizeDistrictName = (part: string) =>
      part.replace(/^\s*(district|quan|quận)\s*/i, '').trim();

    const rawWardName = normalizeWardName(wardPart);
    const rawDistrictName = normalizeDistrictName(districtPart);
    const districtLooksValid = !!districtPart && /\b(district|quan|quận)\b/i.test(districtPart);

    if (!rawWardName && rawDistrictName && !districtLooksValid) {
      formattedWard = `${wardLabel} ${rawDistrictName}`;
    } else {
      const wardName = rawWardName || rawDistrictName;
      const districtName = districtLooksValid ? cleanNumber(rawDistrictName) : '';
      const wardSegment = wardName ? `${wardLabel} ${cleanNumber(wardName)}` : '';
      const districtSegment = districtName ? `${districtLabel} ${districtName}` : '';
      formattedWard = [wardSegment, districtSegment].filter(Boolean).join(', ');
    }
  }

  let formattedCity = '';

  if (cityValue) {
    const normalizedCity = toAsciiLower(cityValue).replace(/[.]/g, '').trim();
    const hcmcAliases = new Set([
      'ho chi minh city',
      'ho chi minh',
      'thanh pho ho chi minh',
      'tp ho chi minh',
      'tphcm',
      'tp hcm',
      'hcmc',
    ]);

    formattedCity = hcmcAliases.has(normalizedCity) ? t('address.hcmc') : cityValue;
  }

  if (language.startsWith('vi') && formattedWard) {
    formattedWard = formattedWard
      .replace(/\bDistrict\b/gi, t('address.district'))
      .replace(/\bWard\b/gi, t('address.ward'));
  }

  return [formattedWard, formattedCity].filter(Boolean).join(', ');
};

export const normalizeDistrictLabel = (districtValue: string, cityValue: string) => {
  const district = districtValue.trim();
  if (!district) return '';

  const normalized = toAsciiLower(district);
  const inHcmc = ['ho chi minh city', 'ho chi minh', 'hcmc', 'tphcm', 'tp hcm'].includes(
    toAsciiLower(cityValue).replace(/[.]/g, '')
  );

  const districtNumberMatch = district.match(/(district|quan|quận)\s*0*([0-9]+)/i);
  if (districtNumberMatch?.[2]) {
    return `Quận ${Number(districtNumberMatch[2])}`;
  }

  if (/^(ward|phuong|phường)\s/i.test(district)) {
    return district;
  }

  if (/^(huyen|huyện)\s/i.test(normalized)) {
    return district.replace(/^(huyen|huyện)\s*/i, 'Huyện ');
  }

  if (/^(tp|thanh pho|thành phố)\s/i.test(normalized)) {
    return district;
  }

  return inHcmc ? `Quận ${district}` : district;
};

export const normalizeCityLabel = (cityValue: string) => {
  const normalized = toAsciiLower(cityValue).replace(/[.]/g, '').trim();
  const hcmAliases = new Set([
    'ho chi minh city',
    'ho chi minh',
    'thanh pho ho chi minh',
    'tp ho chi minh',
    'tphcm',
    'tp hcm',
    'hcmc',
  ]);

  return hcmAliases.has(normalized) ? 'TPHCM' : cityValue;
};

export const buildSortOrder = (value: 'distance' | 'rating' | 'name' | 'createdAt') =>
  value === 'rating' || value === 'createdAt' ? 'desc' : 'asc';

export interface Category {
  id: string;
  titleKey: string;
  icon: string;
}

export const CATEGORIES: Category[] = [
  { id: 'dining', titleKey: 'categories.diningOut', icon: '🍴' },
  { id: 'movies', titleKey: 'categories.movies', icon: '🎬' },
  { id: 'travel', titleKey: 'categories.travel', icon: '✈️' },
  { id: 'photography', titleKey: 'categories.photography', icon: '📸' },
  { id: 'music', titleKey: 'categories.music', icon: '🎵' },
  { id: 'fitness', titleKey: 'categories.fitnessGym', icon: '💪' },
  { id: 'fishing', titleKey: 'categories.fishing', icon: '🎣' },
  { id: 'stay_in', titleKey: 'categories.stayIn', icon: '🏠' },
  { id: 'spa', titleKey: 'categories.spaBeauty', icon: '✨' },
  { id: 'walk', titleKey: 'categories.walk', icon: '🚶' },
  { id: 'esports', titleKey: 'categories.esports', icon: '🎮' },
  { id: 'friends', titleKey: 'categories.meetingFriends', icon: '👫' },
  { id: 'cafe', titleKey: 'categories.cafe', icon: '☕' },
  { id: 'dating', titleKey: 'categories.dating', icon: '❤️' },
  { id: 'study', titleKey: 'categories.study', icon: '📚' },
  { id: 'volunteering', titleKey: 'categories.volunteering', icon: '🤝' },
  { id: 'sports', titleKey: 'categories.sports', icon: '⚽' },
  { id: 'art', titleKey: 'categories.art', icon: '🎨' },
  { id: 'shopping', titleKey: 'categories.shopping', icon: '🛍️' },
  { id: 'boardgame', titleKey: 'categories.boardGame', icon: '🎲' },
  { id: 'nightlife', titleKey: 'categories.nightlife', icon: '🍺' },
  { id: 'gaming', titleKey: 'categories.gaming', icon: '🕹️' },
];

export const CATEGORY_ICON_MAP: Record<string, string> = {
  'Tourist attraction': '✈️',
  Park: '🌳',
  'Coffee shop': '☕️',
  Cafe: '☕️',
  Restaurant: '🍽️',
  Bar: '🍺',
  Museum: '🏛️',
  'Movie theater': '🎬',
  'Shopping mall': '🛍️',
  Gym: '💪',
  Hotel: '🏠',
  'Beauty salon': '💄',
  'Barbecue restaurant': '🍴',
};

export function getCategoryIcon(name: string): string {
  return CATEGORY_ICON_MAP[name] ?? '❓';
}
