import { Injectable } from '@nestjs/common';
import { GeoConstants } from 'src/shared/constants/place.constant';
import { PlaceRecommendationResponseDto } from 'src/shared/dtos/recommendation.dto';
import { SessionLocation } from 'src/shared/types/group-session.type';

@Injectable()
export class RecommendationHelper {
  deduplicatePlaces(
    places: PlaceRecommendationResponseDto[],
  ): PlaceRecommendationResponseDto[] {
    const placeMap = new Map<string, PlaceRecommendationResponseDto>();

    places.forEach((place) => {
      if (placeMap.get(place.id)) {
        return;
      }

      placeMap.set(place.id, place);
    });

    return Array.from(placeMap.values());
  }

  shufflePlaces(
    array: PlaceRecommendationResponseDto[],
  ): PlaceRecommendationResponseDto[] {
    const shuffled = [...array];

    for (let index = shuffled.length - 1; index > 0; index--) {
      const randomIndex = Math.floor(Math.random() * (index + 1));

      [shuffled[index], shuffled[randomIndex]] = [
        shuffled[randomIndex],
        shuffled[index],
      ];
    }

    return shuffled;
  }

  getSessionRecommendationCacheKey(sessionId: string): string {
    return `session:${sessionId}:recommendations`;
  }

  getSessionLocationPattern(sessionId: string): string {
    return `session:${sessionId}:location:*`;
  }

  calculateCentroid(locations: SessionLocation[]): {
    latitude: number | null;
    longitude: number | null;
  } {
    if (locations.length === 0) {
      return { latitude: null, longitude: null };
    }

    const locationTotals = locations.reduce(
      (totals, location) => ({
        latitude: totals.latitude + location.latitude,
        longitude: totals.longitude + location.longitude,
      }),
      { latitude: 0, longitude: 0 },
    );

    return {
      latitude: locationTotals.latitude / locations.length,
      longitude: locationTotals.longitude / locations.length,
    };
  }

  parseSessionLocation(
    key: string,
    rawLocation: string,
  ): SessionLocation | null {
    let parsedLocation: { latitude?: number; longitude?: number };

    try {
      parsedLocation = JSON.parse(rawLocation) as {
        latitude?: number;
        longitude?: number;
      };
    } catch {
      return null;
    }

    if (
      typeof parsedLocation.latitude !== 'number' ||
      typeof parsedLocation.longitude !== 'number'
    ) {
      return null;
    }

    const memberId = key.split(':').pop();
    if (!memberId) {
      return null;
    }

    return {
      memberId,
      latitude: parsedLocation.latitude,
      longitude: parsedLocation.longitude,
    };
  }

  getBoundingBoxCondition(
    latitude: number,
    longitude: number,
    radiusKm: number,
  ) {
    const latitudeDelta =
      radiusKm / GeoConstants.KILOMETERS_PER_DEGREE_LATITUDE;

    const latitudeInRadians =
      latitude * (Math.PI / GeoConstants.DEGREES_IN_HALF_CIRCLE);
    const actualKilometerPerDegreeLongitude =
      GeoConstants.KILOMETERS_PER_DEGREE_LATITUDE * Math.cos(latitudeInRadians);
    const longitudeDelta =
      radiusKm / Math.max(Math.abs(actualKilometerPerDegreeLongitude), 0.00001);

    return {
      latitude: {
        gte: latitude - latitudeDelta,
        lte: latitude + latitudeDelta,
      },
      longitude: {
        gte: longitude - longitudeDelta,
        lte: longitude + longitudeDelta,
      },
    };
  }
}
