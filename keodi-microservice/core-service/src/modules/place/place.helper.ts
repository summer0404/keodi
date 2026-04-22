import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PlaceErrorMessages } from 'src/shared/constants/error.constant';
import { ImageConstants } from 'src/shared/constants/image.constant';
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

  buildFullAddress(
    street: string,
    ward: string,
    city: string,
    countryCode: string,
  ): string {
    return [street, ward, city, countryCode].map((item) => item.trim()).join(', ');
  }

  normalizeCountryCode(countryCode: string): string {
    return countryCode.trim().toUpperCase();
  }

  buildPlaceImageKey(contentType?: string): string {
    const extension =
      contentType === 'image/jpeg' ? 'jpg' : contentType?.split('/')[1] ?? 'jpg';

    return `${ImageConstants.IMAGE_FOLDERS.PLACE_IMAGES}/${Date.now()}.${extension}`;
  }
}
