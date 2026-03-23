export class PlaceRecommendationResponseDto {
    id: string;
    name: string;
    description: string
    fullAddress: string;
    latitude: number;
    longitude: number;
    featureImageUrl: string | null;
    googleMapLink: string | null;
    phoneNumber: string | null;
    website: string | null;
}