export interface OpeningHourInfo {
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
}

export interface CategoryInfo {
  id: string;
  name: string;
  isMain: boolean;
}

export interface RawPlace {
  id: string;
  fromGoogle: boolean;
  name: string;
  description: string | null;
  rating: number;
  googleMapLink: string;
  website: string | null;
  phoneNumber: string | null;
  featureImageUrl: string | null;
  ownerId: string | null;
  latitude: number;
  longitude: number;
  fullAddress: string | null;
  ward: string | null;
  street: string | null;
  city: string | null;
  countryCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlaceWithDistance extends RawPlace {
  distance: number;
  isFavorite: boolean;
  openingHours: OpeningHourInfo[];
  categories: CategoryInfo[];
}

export interface PlacePaginatedResponse {
  places: PlaceWithDistance[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

export type PlaceDetailResponse = Omit<PlaceWithDistance, 'distance'>;
