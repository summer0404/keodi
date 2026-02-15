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
