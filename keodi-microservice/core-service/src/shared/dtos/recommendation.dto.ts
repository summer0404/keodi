import { CategoryInfo, OpeningHourInfo } from '../interfaces/place.interface';


export class RecommendationPlaceRow {
  id: string;
  name: string;
  description: string | null;
  rating: number | null;
  fullAddress: string | null;
  latitude: number;
  longitude: number;
  featureImageUrl: string | null;
  googleMapLink: string | null;
  phoneNumber: string | null;
  website: string | null;
}; 

export class PlaceRecommendationResponseDto extends RecommendationPlaceRow {
  openingHours: OpeningHourInfo[];
  categories: CategoryInfo[];
}
