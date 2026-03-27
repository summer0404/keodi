import type { PlaceItem } from '@/types/api';

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

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;

export const formatDistance = (distance: number | undefined) => {
  if (typeof distance !== 'number') return '--';

  // Convert to meters if less than 1 km
  if (distance < 1) {
    const meters = Math.round(distance * 1000);
    return `${meters} m`;
  }

  // Keep km format with 1 decimal place
  return `${distance.toFixed(1)} km`;
};

export const extractImageUrls = (featureImageUrl: string | null | undefined) => {
  const raw = featureImageUrl?.trim();
  if (!raw) return [];

  if (!raw.includes(',')) {
    return [raw];
  }

  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

export const formatDateMonthYear = (dateString: string): string => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '--';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

export const getPrimaryImageUrl = (featureImageUrl: string | null | undefined) => {
  const urls = extractImageUrls(featureImageUrl);
  return urls.length ? urls[0] : null;
};

export const DAY_OF_WEEK_LABELS: Record<number, string> = {
  1: 'Thứ 2',
  2: 'Thứ 3',
  3: 'Thứ 4',
  4: 'Thứ 5',
  5: 'Thứ 6',
  6: 'Thứ 7',
  7: 'Chủ nhật',
};

const DAY_OF_WEEK_I18N_KEYS: Record<number, string> = {
  1: 'dayOfWeek.mon',
  2: 'dayOfWeek.tue',
  3: 'dayOfWeek.wed',
  4: 'dayOfWeek.thu',
  5: 'dayOfWeek.fri',
  6: 'dayOfWeek.sat',
  7: 'dayOfWeek.sun',
};

export const getDayOfWeekLabel = (dayOfWeek: number, t?: (key: string) => string) => {
  const fallback = DAY_OF_WEEK_LABELS[dayOfWeek] ?? '--';
  const i18nKey = DAY_OF_WEEK_I18N_KEYS[dayOfWeek];

  if (!t || !i18nKey) {
    return fallback;
  }

  const translated = t(i18nKey);
  // i18next returns key itself when missing translation.
  if (!translated || translated === i18nKey) {
    return fallback;
  }

  return translated;
};

export type ParsedOpeningHour = {
  dayOfWeek: number;
  openMinutes: number;
  closeMinutes: number;
  timeRangeLabel: string;
  overnight: boolean;
};

export type OpeningHoursGroup = {
  startDay: number;
  endDay: number;
  timeRangeLabel: string;
};

export const formatLocalTime = (isoTime: string) => {
  const parsedDate = new Date(isoTime);
  if (Number.isNaN(parsedDate.getTime())) return null;

  const hours = parsedDate.getHours();
  const minutes = String(parsedDate.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const parseOpeningHours = (openingHours: PlaceItem['openingHours']): ParsedOpeningHour[] => {
  if (!openingHours?.length) return [];

  return openingHours
    .map((item) => {
      if (item.dayOfWeek < 1 || item.dayOfWeek > 7) return null;

      const openDate = new Date(item.openTime);
      const closeDate = new Date(item.closeTime);
      if (Number.isNaN(openDate.getTime()) || Number.isNaN(closeDate.getTime())) return null;

      const openLabel = formatLocalTime(item.openTime);
      const closeLabel = formatLocalTime(item.closeTime);
      if (!openLabel || !closeLabel) return null;

      const openMinutes = openDate.getHours() * 60 + openDate.getMinutes();
      const closeMinutes = closeDate.getHours() * 60 + closeDate.getMinutes();

      return {
        dayOfWeek: item.dayOfWeek,
        openMinutes,
        closeMinutes,
        timeRangeLabel: `${openLabel} - ${closeLabel}`,
        overnight: closeMinutes <= openMinutes,
      } satisfies ParsedOpeningHour;
    })
    .filter((item): item is ParsedOpeningHour => !!item)
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
};

export const groupOpeningHoursByRange = (
  openingHours: PlaceItem['openingHours']
): OpeningHoursGroup[] => {
  const parsed = parseOpeningHours(openingHours);
  if (!parsed.length) return [];

  const groups: OpeningHoursGroup[] = [];

  for (const item of parsed) {
    const previousGroup = groups[groups.length - 1];
    if (
      previousGroup &&
      previousGroup.timeRangeLabel === item.timeRangeLabel &&
      previousGroup.endDay + 1 === item.dayOfWeek
    ) {
      previousGroup.endDay = item.dayOfWeek;
      continue;
    }

    groups.push({
      startDay: item.dayOfWeek,
      endDay: item.dayOfWeek,
      timeRangeLabel: item.timeRangeLabel,
    });
  }

  return groups;
};

export const formatOpeningHoursLabel = (
  openingHours: PlaceItem['openingHours'],
  t?: (key: string) => string
) => {
  const groups = groupOpeningHoursByRange(openingHours);
  if (!groups.length) return undefined;

  return groups
    .map((group) => {
      const dayLabel =
        group.startDay === group.endDay
          ? getDayOfWeekLabel(group.startDay, t)
          : `${getDayOfWeekLabel(group.startDay, t)} - ${getDayOfWeekLabel(group.endDay, t)}`;

      return `${dayLabel}: ${group.timeRangeLabel}`;
    })
    .join(' | ');
};

export const isPlaceOpenNow = (openingHours: PlaceItem['openingHours']) => {
  const parsed = parseOpeningHours(openingHours);
  if (!parsed.length) return true;

  const now = new Date();
  const currentDay = now.getDay() === 0 ? 7 : now.getDay();
  const previousDay = currentDay === 1 ? 7 : currentDay - 1;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const hasOpenWindowToday = parsed.some((entry) => {
    if (entry.dayOfWeek !== currentDay) return false;

    if (!entry.overnight) {
      return currentMinutes >= entry.openMinutes && currentMinutes < entry.closeMinutes;
    }

    return currentMinutes >= entry.openMinutes;
  });

  if (hasOpenWindowToday) {
    return true;
  }

  return parsed.some(
    (entry) =>
      entry.dayOfWeek === previousDay && entry.overnight && currentMinutes < entry.closeMinutes
  );
};

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

export const DEFAULT_AVATAR_SOURCE = require('@/assets/images/default-avatar.webp');
export const DEFAULT_PLACE_IMAGE = require('@/assets/images/img-cover.webp');

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
