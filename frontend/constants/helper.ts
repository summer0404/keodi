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
  'Park': '🌳',
  'Coffee shop': '☕️',
  'Cafe': '☕️',
  'Restaurant': '🍽️',
  'Bar': '🍺',
  'Museum': '🏛️',
  'Movie theater': '🎬',
  'Shopping mall': '🛍️',
  'Gym': '💪',
  'Hotel': '🏠',
  'Beauty salon': '💄',
  "Barbecue restaurant": "🍴"
};

export function getCategoryIcon(name: string): string {
  return CATEGORY_ICON_MAP[name] ?? '❓';
}
