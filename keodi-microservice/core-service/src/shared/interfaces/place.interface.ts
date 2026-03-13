import { Place } from "@prisma/client";

export interface PlaceWithDistance extends Place {
    distance: number;
    isFavorite: boolean;
}