import { Injectable } from "@nestjs/common";


@Injectable()
export class RecommendationHelper {
    deduplicatePlaces(places: any[]): any[] {
        const placeMap = new Map<string, any>();

        places.forEach(place => {
            if (placeMap.get(place.id)) {
                return
            }

            placeMap.set(place.id, place);
        });

        return Array.from(placeMap.values());
    }

    shufflePlaces(array: any[]): any[] {
        const shuffled = [...array];

        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));

            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        return shuffled;
    }
}