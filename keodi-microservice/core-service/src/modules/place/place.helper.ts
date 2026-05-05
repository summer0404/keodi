import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Prisma } from '@prisma/client';
import { PlaceErrorMessages } from 'src/shared/constants/error.constant';
import { ImageConstants } from 'src/shared/constants/image.constant';
import { GeoConstants } from 'src/shared/constants/place.constant';
import { VECTOR_SIMILARITY_THRESHOLD } from 'src/shared/constants/search.constant';
import { CreatePlaceDto } from 'src/shared/dtos/place.dto';
import { PlaceSortBy, SortOrder } from 'src/shared/enums/sort.enum';
import { SearchQueryConfig } from 'src/shared/types/search.type';

@Injectable()
export class PlaceHelper {
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
      const rawDay = openingHour.dayOfWeek;
      let dayOfWeek: number = Number(rawDay);

      if (dayOfWeek < 0 || dayOfWeek > 6) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: PlaceErrorMessages.INVALID_OPENING_HOUR_RANGE,
        });
      }

      if (usedDays.has(dayOfWeek)) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: PlaceErrorMessages.DUPLICATED_OPENING_HOUR_DAY,
        });
      }
      usedDays.add(dayOfWeek);


      if (!openingHour.openTime && !openingHour.closeTime) {
        return {
          dayOfWeek: dayOfWeek,
          openTime: null,
          closeTime: null,
        };
      }

      if (!openingHour.openTime || !openingHour.closeTime) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: PlaceErrorMessages.INVALID_OPENING_HOUR_INTERVAL,
        });
      }

      const openTime = this.parseOpeningHourTime(openingHour.openTime);
      const closeTime = this.parseOpeningHourTime(openingHour.closeTime);

      if (closeTime <= openTime) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: PlaceErrorMessages.INVALID_OPENING_HOUR_INTERVAL,
        });
      }

      return {
        dayOfWeek: dayOfWeek,
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

  buildPlaceImageKey(contentType?: string): string {
    const extension =
      contentType === 'image/jpeg' ? 'jpg' : contentType?.split('/')[1] ?? 'jpg';

    return `${ImageConstants.IMAGE_FOLDERS.PLACE_IMAGES}/${Date.now()}.${extension}`;
  }

  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const toRad = (deg: number) =>
      (deg * Math.PI) / GeoConstants.DEGREES_IN_HALF_CIRCLE;
    return (
      GeoConstants.EARTH_RADIUS_IN_KILOMETERS *
      Math.acos(
        Math.min(
          1,
          Math.max(
            -1,
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2) - toRad(lon1)) +
              Math.sin(toRad(lat1)) * Math.sin(toRad(lat2)),
          ),
        ),
      )
    );
  }

  calculateGeoDeltas(
    latitude: number,
    radius: number,
  ): { latDelta: number; longDelta: number } {
    const latDelta = radius / GeoConstants.KILOMETERS_PER_DEGREE_LATITUDE;
    const longDelta =
      radius /
      (GeoConstants.KILOMETERS_PER_DEGREE_LATITUDE *
        Math.cos((latitude * Math.PI) / GeoConstants.DEGREES_IN_HALF_CIRCLE));
    return { latDelta, longDelta };
  }

  buildPaginationParams(
    page: number,
    limit: number,
    sortBy: PlaceSortBy,
    sortOrder: SortOrder,
  ): { offset: number; orderByClause: string } {
    const allowedSortBy: string[] = Object.values(PlaceSortBy);
    const allowedSortOrder: string[] = Object.values(SortOrder);

    if (!allowedSortBy.includes(sortBy)) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: PlaceErrorMessages.INVALID_SORT_BY,
      });
    }
    if (!allowedSortOrder.includes(sortOrder)) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: PlaceErrorMessages.INVALID_SORT_ORDER,
      });
    }

    const offset = (page - 1) * limit;
    const order = sortOrder.toUpperCase();
    const orderByClause = `ORDER BY ${sortBy} ${order}`;
    return { offset, orderByClause };
  }

  buildEmbeddingSearchCondition(embedding?: number[]): Prisma.Sql {
    if (!embedding || embedding.length === 0) {
      return Prisma.empty;
    }
    const vectorStr = `[${embedding.join(',')}]`;
    return Prisma.sql`
            AND p.embedding_title IS NOT NULL
            AND (
                0.65 * (1 - (p.embedding_title <=> CAST(${vectorStr} AS vector)))
                + 0.35 * COALESCE((1 - (p.embedding_full <=> CAST(${vectorStr} AS vector))), 0)
            ) >= ${VECTOR_SIMILARITY_THRESHOLD}
        `;
  }

  buildKeywordSearchCondition(keywords?: string): Prisma.Sql {
    if (!keywords?.trim()) {
      return Prisma.empty;
    }

    return Prisma.sql`
            AND p.fts_search_vector @@ websearch_to_tsquery('simple', f_unaccent(${keywords}))
        `;
  }

  buildSearchCondition(embedding?: number[], keywords?: string): Prisma.Sql {
    if (keywords?.trim()) {
      return this.buildKeywordSearchCondition(keywords);
    }

    return this.buildEmbeddingSearchCondition(embedding);
  }

  buildEmbeddingQueryConfig(
    embedding: number[] | undefined,
    orderByClause: string,
  ): SearchQueryConfig {
    const hasEmbedding = embedding && embedding.length > 0;
    const searchOrderBy = hasEmbedding
      ? 'ORDER BY similarity_score DESC, distance ASC'
      : orderByClause;

    const vectorStr = hasEmbedding ? `[${embedding.join(',')}]` : null;
    const similarityColumn = vectorStr
      ? Prisma.sql`,
                    (
                        0.65 * (1 - (p.embedding_title <=> CAST(${vectorStr} AS vector)))
                        + 0.35 * COALESCE((1 - (p.embedding_full <=> CAST(${vectorStr} AS vector))), 0)
                    ) AS similarity_score`
      : Prisma.sql`, NULL AS similarity_score`;

    return {
      searchCondition: this.buildEmbeddingSearchCondition(embedding),
      similarityColumn,
      searchOrderBy,
    };
  }

  buildKeywordQueryConfig(keywords: string): SearchQueryConfig {
    const keywordRank = Prisma.sql`,
                    ts_rank_cd(
                        p.fts_search_vector,
                        websearch_to_tsquery('simple', f_unaccent(${keywords}))
                    ) AS similarity_score`;

    return {
      searchCondition: this.buildKeywordSearchCondition(keywords),
      similarityColumn: keywordRank,
      searchOrderBy: 'ORDER BY similarity_score DESC, distance ASC',
    };
  }

  buildSearchQueryConfig(
    embedding: number[] | undefined,
    keywords: string | undefined,
    orderByClause: string,
  ): SearchQueryConfig {
    if (keywords?.trim()) {
      return this.buildKeywordQueryConfig(keywords);
    }

    return this.buildEmbeddingQueryConfig(embedding, orderByClause);
  }
}
