import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { createId } from '@paralleldrive/cuid2';
import { PlaceService } from 'src/modules/place/place.service';
import { RecommendationService } from 'src/modules/recommendation/recommendation.service';
import { SettingService } from 'src/modules/setting/setting.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { RedisService } from 'src/providers/redis/redis.service';
import {
  NotificationPreferredChannel,
  NotificationTopics,
  NotificationType,
} from 'src/shared/constants/notification-topic.constant';
import { PlaceSortBy, SortOrder } from 'src/shared/enums/sort.enum';

interface UserLocation {
  lat: number;
  lng: number;
  updatedAt: string;
}

@Injectable()
export class NotificationPushScheduler {
  private static readonly USER_LOCATIONS_KEY = 'user:locations';
  private static readonly STALE_DAYS = 7;
  private readonly logger = new Logger(NotificationPushScheduler.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly kafkaService: KafkaService,
    private readonly settingService: SettingService,
    private readonly recommendationService: RecommendationService,
    private readonly placeService: PlaceService,
  ) {}

  @Cron('0 10 * * *') // Daily at 10 AM
  async pushNearbyAndRecommendations() {
    this.logger.log(
      'Running daily nearby & recommendation push notifications...',
    );

    const allLocations = (await this.redisService.hGetAll(
      NotificationPushScheduler.USER_LOCATIONS_KEY,
    )) as Record<string, string>;

    if (!allLocations || Object.keys(allLocations).length === 0) {
      this.logger.log('No user locations found, skipping.');
      return;
    }

    const staleThreshold =
      Date.now() - NotificationPushScheduler.STALE_DAYS * 24 * 60 * 60 * 1000;

    const kafka = this.kafkaService.getClient();

    for (const [userId, raw] of Object.entries(allLocations)) {
      try {
        const location = JSON.parse(raw) as UserLocation;

        if (new Date(location.updatedAt).getTime() < staleThreshold) {
          continue;
        }

        const settings = await this.settingService.get(userId);

        if (settings.notifyNearbyPlaces) {
          await this.pushNearbyPlaces(kafka, userId, location, settings);
        }

        if (settings.notifyRecommendations) {
          await this.pushRecommendations(kafka, userId, location);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Failed to process push for user ${userId}: ${message}`,
        );
      }
    }

    this.logger.log('Daily push notifications completed.');
  }

  private async pushNearbyPlaces(
    kafka: ReturnType<KafkaService['getClient']>,
    userId: string,
    location: UserLocation,
    settings: Record<string, unknown>,
  ) {
    try {
      const radiusMap: Record<string, number> = {
        KM_2: 2,
        KM_5: 5,
        KM_10: 10,
        KM_20: 20,
      };
      const radiusKey = (settings.defaultSearchRadius as string) ?? 'KM_5';
      const radius = radiusMap[radiusKey] ?? 5;

      const result = await this.placeService.findNearby({
        latitude: location.lat,
        longitude: location.lng,
        radius,
        page: 1,
        limit: 5,
        sortBy: PlaceSortBy.DISTANCE,
        sortOrder: SortOrder.ASC,
        userId,
      });

      const places = result?.places;
      if (!places?.length) return;

      const topPlace = places[0];
      kafka.emit(NotificationTopics.Dispatch, {
        eventId: createId(),
        userId,
        type: NotificationType.NEARBY_PLACE,
        title: 'Places Near You',
        body: `Check out ${topPlace.name} and ${places.length - 1} more places nearby!`,
        data: { placeId: topPlace.id },
        preferredChannel: NotificationPreferredChannel.FCM,
        createdAt: new Date().toISOString(),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Nearby push failed for ${userId}: ${message}`);
    }
  }

  private async pushRecommendations(
    kafka: ReturnType<KafkaService['getClient']>,
    userId: string,
    location: UserLocation,
  ) {
    try {
      const places = await this.recommendationService.getForYou(
        userId,
        location.lat,
        location.lng,
      );

      if (!places?.length) return;

      const topPlace = places[0];
      kafka.emit(NotificationTopics.Dispatch, {
        eventId: createId(),
        userId,
        type: NotificationType.RECOMMENDATION,
        title: 'Recommended For You',
        body: `We think you'll love ${topPlace.name}! Tap to explore.`,
        data: { placeId: topPlace.id },
        preferredChannel: NotificationPreferredChannel.FCM,
        createdAt: new Date().toISOString(),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Recommendation push failed for ${userId}: ${message}`);
    }
  }
}
