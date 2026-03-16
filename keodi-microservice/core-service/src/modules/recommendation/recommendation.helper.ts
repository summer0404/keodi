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
}