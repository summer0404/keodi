import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PlaceImageType } from '@prisma/client';
import { PlaceErrorMessages } from 'src/shared/constants/error.constant';
import { CreatePlaceDto } from 'src/shared/dtos/place.dto';

@Injectable()
export class PlaceHelper {
  trimToNull(value?: string | null): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  toGoogleMapLink(latitude: number, longitude: number): string {
    return `https://maps.google.com/?q=${latitude},${longitude}`;
  }

  parseOpeningHourTime(value: string): Date {
    const trimmed = value.trim();
    const matched = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(trimmed);
    if (!matched) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: PlaceErrorMessages.INVALID_OPENING_HOUR_FORMAT,
      });
    }

    const hour = matched[1];
    const minute = matched[2];
    const second = matched[3] ?? '00';
    return new Date(`1970-01-01T${hour}:${minute}:${second}.000Z`);
  }

  normalizeOpeningHours(openingHours?: CreatePlaceDto['openingHours']): {
    dayOfWeek: number;
    openTime: Date | null;
    closeTime: Date | null;
  }[] {
    if (!openingHours?.length) {
      return [];
    }

    const usedDays = new Set<number>();

    return openingHours.map((openingHour) => {
      if (openingHour.dayOfWeek < 0 || openingHour.dayOfWeek > 6) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: PlaceErrorMessages.INVALID_OPENING_HOUR_RANGE,
        });
      }

      if (usedDays.has(openingHour.dayOfWeek)) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: PlaceErrorMessages.DUPLICATED_OPENING_HOUR_DAY,
        });
      }
      usedDays.add(openingHour.dayOfWeek);

      const openTimeRaw = this.trimToNull(openingHour.openTime);
      const closeTimeRaw = this.trimToNull(openingHour.closeTime);

      if (!openTimeRaw && !closeTimeRaw) {
        return {
          dayOfWeek: openingHour.dayOfWeek,
          openTime: null,
          closeTime: null,
        };
      }

      if (!openTimeRaw || !closeTimeRaw) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: PlaceErrorMessages.INVALID_OPENING_HOUR_INTERVAL,
        });
      }

      const openTime = this.parseOpeningHourTime(openTimeRaw);
      const closeTime = this.parseOpeningHourTime(closeTimeRaw);

      if (closeTime <= openTime) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: PlaceErrorMessages.INVALID_OPENING_HOUR_INTERVAL,
        });
      }

      return {
        dayOfWeek: openingHour.dayOfWeek,
        openTime,
        closeTime,
      };
    });
  }

  buildPlaceImageInputs(createPlaceDto: CreatePlaceDto): {
    featureImageUrl: string | null;
    placeImages: {
      type: PlaceImageType;
      url: string;
    }[];
  } {
    const coverImageUrl = this.trimToNull(createPlaceDto.coverImageUrl);
    const featureImageUrl = this.trimToNull(createPlaceDto.featureImageUrl);
    const galleryImageUrls = (createPlaceDto.galleryImageUrls ?? [])
      .map((url) => this.trimToNull(url))
      .filter((url): url is string => !!url);

    const placeImages: {
      type: PlaceImageType;
      url: string;
    }[] = [];

    if (coverImageUrl) {
      placeImages.push({ type: PlaceImageType.COVER, url: coverImageUrl });
    }
    if (featureImageUrl) {
      placeImages.push({ type: PlaceImageType.FEATURE, url: featureImageUrl });
    }
    for (const galleryImageUrl of galleryImageUrls) {
      placeImages.push({ type: PlaceImageType.GALLERY, url: galleryImageUrl });
    }

    if (placeImages.length === 0) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: PlaceErrorMessages.PLACE_IMAGE_REQUIRED,
      });
    }

    return {
      featureImageUrl:
        featureImageUrl ?? coverImageUrl ?? galleryImageUrls[0] ?? null,
      placeImages,
    };
  }
}
