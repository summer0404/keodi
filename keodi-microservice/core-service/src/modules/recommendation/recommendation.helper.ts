import { Injectable } from "@nestjs/common";
import { GeoConstants } from "src/shared/constants/place.constant";
import { PlaceRecommendationResponseDto } from "src/shared/dtos/recommendation.dto";


@Injectable()
export class RecommendationHelper {
    deduplicatePlaces(places: PlaceRecommendationResponseDto[]): PlaceRecommendationResponseDto[] {
        const placeMap = new Map<string, PlaceRecommendationResponseDto>();

        places.forEach(place => {
            if (placeMap.get(place.id)) {
                return
            }

            placeMap.set(place.id, place);
        });

        return Array.from(placeMap.values());
    }

    shufflePlaces(array: PlaceRecommendationResponseDto[]): PlaceRecommendationResponseDto[] {
        const shuffled = [...array];

        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));

            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        return shuffled;
    }

    getBoundingBoxCondition(latitude: number, longitude: number, radiusKm: number) { 
        const latitudeDelta = radiusKm / GeoConstants.KILOMETERS_PER_DEGREE_LATITUDE;

        const latitudeInRadians = latitude * (Math.PI / GeoConstants.DEGREES_IN_HALF_CIRCLE);
        const actualKilometerPerDegreeLongitude = GeoConstants.KILOMETERS_PER_DEGREE_LATITUDE * Math.cos(latitudeInRadians);
        const longitudeDelta = radiusKm / actualKilometerPerDegreeLongitude;

        return {
            latitude: {
                gte: latitude - latitudeDelta,
                lte: latitude + latitudeDelta,
            },
            longitude: {
                gte: longitude - longitudeDelta,
                lte: longitude + longitudeDelta,
            },
        }
    }
}