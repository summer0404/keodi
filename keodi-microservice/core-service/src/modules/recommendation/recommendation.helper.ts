import { Injectable } from "@nestjs/common";
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
}