import { RpcException } from '@nestjs/microservices';
import { Prisma } from '@prisma/client';
import { GeoConstants } from 'src/shared/constants/place.constant';
import { PlaceSortBy, SortOrder } from 'src/shared/enums/sort.enum';
import { PlaceHelper } from '../place.helper';

describe('PlaceHelper', () => {
  let helper: PlaceHelper;

  beforeEach(() => {
    jest.clearAllMocks();
    helper = new PlaceHelper();
  });

  // ──────────────────────────────────────────────
  // toGoogleMapLink
  // ──────────────────────────────────────────────
  describe('toGoogleMapLink', () => {
    it('builds correct Google Maps URL', () => {
      expect(helper.toGoogleMapLink(10.762622, 106.660172)).toBe(
        'https://maps.google.com/?q=10.762622,106.660172',
      );
    });

    it('handles negative coordinates', () => {
      expect(helper.toGoogleMapLink(-33.8688, 151.2093)).toBe(
        'https://maps.google.com/?q=-33.8688,151.2093',
      );
    });
  });

  // ──────────────────────────────────────────────
  // parseOpeningHourTime
  // ──────────────────────────────────────────────
  describe('parseOpeningHourTime', () => {
    it('parses valid HH:MM time string into a Date', () => {
      const result = helper.parseOpeningHourTime('09:30');
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toContain('09:30:00');
    });

    it('parses valid HH:MM:SS time string', () => {
      const result = helper.parseOpeningHourTime('14:00:00');
      expect(result.toISOString()).toContain('14:00:00');
    });

    it('throws RpcException for invalid time format', () => {
      expect(() => helper.parseOpeningHourTime('25:00')).toThrow(RpcException);
    });

    it('throws RpcException for non-time string', () => {
      expect(() => helper.parseOpeningHourTime('not-a-time')).toThrow(
        RpcException,
      );
    });

    it('throws RpcException for empty string', () => {
      expect(() => helper.parseOpeningHourTime('')).toThrow(RpcException);
    });
  });

  // ──────────────────────────────────────────────
  // normalizeOpeningHours
  // ──────────────────────────────────────────────
  describe('normalizeOpeningHours', () => {
    it('returns empty array when openingHours is not provided', () => {
      expect(helper.normalizeOpeningHours(undefined)).toEqual([]);
    });

    it('returns empty array for empty array input', () => {
      expect(helper.normalizeOpeningHours([])).toEqual([]);
    });

    it('returns null openTime and closeTime when both are absent (closed day)', () => {
      const result = helper.normalizeOpeningHours([{ dayOfWeek: 0 }]);
      expect(result[0].openTime).toBeNull();
      expect(result[0].closeTime).toBeNull();
    });

    it('throws BAD_REQUEST for dayOfWeek out of range', () => {
      expect(() =>
        helper.normalizeOpeningHours([
          { dayOfWeek: 7, openTime: '09:00', closeTime: '18:00' },
        ]),
      ).toThrow(RpcException);
    });

    it('throws BAD_REQUEST for duplicate dayOfWeek', () => {
      expect(() =>
        helper.normalizeOpeningHours([
          { dayOfWeek: 1, openTime: '09:00', closeTime: '18:00' },
          { dayOfWeek: 1, openTime: '10:00', closeTime: '20:00' },
        ]),
      ).toThrow(RpcException);
    });

    it('throws BAD_REQUEST when only one of openTime / closeTime is provided', () => {
      expect(() =>
        helper.normalizeOpeningHours([{ dayOfWeek: 2, openTime: '09:00' }]),
      ).toThrow(RpcException);
    });

    it('throws BAD_REQUEST when closeTime is not after openTime', () => {
      expect(() =>
        helper.normalizeOpeningHours([
          { dayOfWeek: 3, openTime: '18:00', closeTime: '09:00' },
        ]),
      ).toThrow(RpcException);
    });

    it('returns correct parsed dates for valid opening hours', () => {
      const result = helper.normalizeOpeningHours([
        { dayOfWeek: 1, openTime: '08:00', closeTime: '22:00' },
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].dayOfWeek).toBe(1);
      expect(result[0].openTime).toBeInstanceOf(Date);
      expect(result[0].closeTime).toBeInstanceOf(Date);
    });
  });

  // ──────────────────────────────────────────────
  // buildFullAddress
  // ──────────────────────────────────────────────
  describe('buildFullAddress', () => {
    it('joins address parts with commas', () => {
      expect(
        helper.buildFullAddress('123 Main St', 'Ward 1', 'Ho Chi Minh', 'VN'),
      ).toBe('123 Main St, Ward 1, Ho Chi Minh, VN');
    });

    it('trims whitespace from each part', () => {
      expect(
        helper.buildFullAddress('  Street  ', '  Ward  ', '  City  ', '  VN  '),
      ).toBe('Street, Ward, City, VN');
    });
  });

  // ──────────────────────────────────────────────
  // buildPlaceImageKey
  // ──────────────────────────────────────────────
  describe('buildPlaceImageKey', () => {
    it('uses jpg extension for image/jpeg content type', () => {
      const key = helper.buildPlaceImageKey('image/jpeg');
      expect(key).toMatch(/\.jpg$/);
    });

    it('uses the sub-type from content-type for other types', () => {
      const key = helper.buildPlaceImageKey('image/png');
      expect(key).toMatch(/\.png$/);
    });

    it('defaults to jpg when content type is undefined', () => {
      const key = helper.buildPlaceImageKey();
      expect(key).toMatch(/\.jpg$/);
    });
  });

  // ──────────────────────────────────────────────
  // calculateGeoDeltas
  // ──────────────────────────────────────────────
  describe('calculateGeoDeltas', () => {
    it('returns correct latDelta for given radius', () => {
      const { latDelta } = helper.calculateGeoDeltas(0, 5);
      expect(latDelta).toBeCloseTo(
        5 / GeoConstants.KILOMETERS_PER_DEGREE_LATITUDE,
      );
    });

    it('returns correct longDelta for equator (latitude 0)', () => {
      const { longDelta } = helper.calculateGeoDeltas(0, 5);
      // cos(0) = 1, so longDelta equals latDelta at equator
      expect(longDelta).toBeCloseTo(
        5 / GeoConstants.KILOMETERS_PER_DEGREE_LATITUDE,
      );
    });

    it('longDelta increases as latitude approaches poles', () => {
      const { longDelta: longDelta45 } = helper.calculateGeoDeltas(45, 5);
      const { longDelta: longDelta0 } = helper.calculateGeoDeltas(0, 5);
      expect(longDelta45).toBeGreaterThan(longDelta0);
    });
  });

  // ──────────────────────────────────────────────
  // buildPaginationParams
  // ──────────────────────────────────────────────
  describe('buildPaginationParams', () => {
    it('returns correct offset and orderByClause for page 1', () => {
      const result = helper.buildPaginationParams(
        1,
        10,
        PlaceSortBy.DISTANCE,
        SortOrder.ASC,
      );
      expect(result.offset).toBe(0);
      expect(result.orderByClause).toBe('ORDER BY distance ASC');
    });

    it('returns correct offset for page 3 with limit 10', () => {
      const result = helper.buildPaginationParams(
        3,
        10,
        PlaceSortBy.RATING,
        SortOrder.DESC,
      );
      expect(result.offset).toBe(20);
      expect(result.orderByClause).toBe('ORDER BY rating DESC');
    });

    it('throws RpcException for invalid sortBy', () => {
      expect(() =>
        helper.buildPaginationParams(
          1,
          10,
          'invalid' as PlaceSortBy,
          SortOrder.ASC,
        ),
      ).toThrow(RpcException);
    });

    it('throws RpcException for invalid sortOrder', () => {
      expect(() =>
        helper.buildPaginationParams(
          1,
          10,
          PlaceSortBy.DISTANCE,
          'invalid' as SortOrder,
        ),
      ).toThrow(RpcException);
    });
  });

  // ──────────────────────────────────────────────
  // buildEmbeddingSearchCondition
  // ──────────────────────────────────────────────
  describe('buildEmbeddingSearchCondition', () => {
    it('returns Prisma.empty when embedding is undefined', () => {
      expect(helper.buildEmbeddingSearchCondition(undefined)).toEqual(
        Prisma.empty,
      );
    });

    it('returns Prisma.empty when embedding is an empty array', () => {
      expect(helper.buildEmbeddingSearchCondition([])).toEqual(Prisma.empty);
    });

    it('returns a non-empty Prisma.Sql when embedding is provided', () => {
      const result = helper.buildEmbeddingSearchCondition([0.1, 0.2, 0.3]);
      expect(result).not.toEqual(Prisma.empty);
    });
  });

  // ──────────────────────────────────────────────
  // buildKeywordSearchCondition
  // ──────────────────────────────────────────────
  describe('buildKeywordSearchCondition', () => {
    it('returns Prisma.empty when keywords is undefined', () => {
      expect(helper.buildKeywordSearchCondition(undefined)).toEqual(
        Prisma.empty,
      );
    });

    it('returns Prisma.empty when keywords is blank', () => {
      expect(helper.buildKeywordSearchCondition('   ')).toEqual(Prisma.empty);
    });

    it('returns a non-empty Prisma.Sql when keywords is provided', () => {
      const result = helper.buildKeywordSearchCondition('coffee');
      expect(result).not.toEqual(Prisma.empty);
    });
  });

  // ──────────────────────────────────────────────
  // buildSearchCondition
  // ──────────────────────────────────────────────
  describe('buildSearchCondition', () => {
    it('delegates to keyword condition when keywords are present', () => {
      const keywordSpy = jest.spyOn(helper, 'buildKeywordSearchCondition');
      const embeddingSpy = jest.spyOn(helper, 'buildEmbeddingSearchCondition');

      helper.buildSearchCondition([0.1, 0.2], 'coffee');

      expect(keywordSpy).toHaveBeenCalledWith('coffee');
      expect(embeddingSpy).not.toHaveBeenCalled();
    });

    it('delegates to embedding condition when keywords are absent', () => {
      const embeddingSpy = jest.spyOn(helper, 'buildEmbeddingSearchCondition');

      helper.buildSearchCondition([0.1, 0.2], undefined);

      expect(embeddingSpy).toHaveBeenCalledWith([0.1, 0.2]);
    });

    it('returns Prisma.empty when both embedding and keywords are absent', () => {
      expect(helper.buildSearchCondition(undefined, undefined)).toEqual(
        Prisma.empty,
      );
    });
  });

  // ──────────────────────────────────────────────
  // buildEmbeddingQueryConfig
  // ──────────────────────────────────────────────
  describe('buildEmbeddingQueryConfig', () => {
    it('uses provided orderByClause when embedding is absent', () => {
      const result = helper.buildEmbeddingQueryConfig(
        undefined,
        'ORDER BY distance ASC',
      );
      expect(result.searchOrderBy).toBe('ORDER BY distance ASC');
    });

    it('overrides orderByClause with similarity sort when embedding is present', () => {
      const result = helper.buildEmbeddingQueryConfig(
        [0.1, 0.2],
        'ORDER BY distance ASC',
      );
      expect(result.searchOrderBy).toBe(
        'ORDER BY similarity_score DESC, distance ASC',
      );
    });

    it('returns a null similarity column when no embedding', () => {
      const result = helper.buildEmbeddingQueryConfig(
        undefined,
        'ORDER BY distance ASC',
      );
      expect(result.similarityColumn).not.toEqual(Prisma.empty);
    });

    it('returns all three config fields', () => {
      const result = helper.buildEmbeddingQueryConfig(
        [0.1],
        'ORDER BY distance ASC',
      );
      expect(result).toHaveProperty('searchCondition');
      expect(result).toHaveProperty('similarityColumn');
      expect(result).toHaveProperty('searchOrderBy');
    });
  });

  // ──────────────────────────────────────────────
  // buildKeywordQueryConfig
  // ──────────────────────────────────────────────
  describe('buildKeywordQueryConfig', () => {
    it('always sorts by similarity_score', () => {
      const result = helper.buildKeywordQueryConfig('coffee');
      expect(result.searchOrderBy).toBe(
        'ORDER BY similarity_score DESC, distance ASC',
      );
    });

    it('returns a non-empty searchCondition', () => {
      const result = helper.buildKeywordQueryConfig('coffee');
      expect(result.searchCondition).not.toEqual(Prisma.empty);
    });

    it('returns all three config fields', () => {
      const result = helper.buildKeywordQueryConfig('coffee');
      expect(result).toHaveProperty('searchCondition');
      expect(result).toHaveProperty('similarityColumn');
      expect(result).toHaveProperty('searchOrderBy');
    });
  });

  // ──────────────────────────────────────────────
  // buildSearchQueryConfig
  // ──────────────────────────────────────────────
  describe('buildSearchQueryConfig', () => {
    it('delegates to keyword config when keywords are present', () => {
      const keywordSpy = jest.spyOn(helper, 'buildKeywordQueryConfig');
      helper.buildSearchQueryConfig(
        undefined,
        'coffee',
        'ORDER BY distance ASC',
      );
      expect(keywordSpy).toHaveBeenCalledWith('coffee');
    });

    it('delegates to embedding config when keywords are absent', () => {
      const embeddingSpy = jest.spyOn(helper, 'buildEmbeddingQueryConfig');
      helper.buildSearchQueryConfig(
        [0.1, 0.2],
        undefined,
        'ORDER BY distance ASC',
      );
      expect(embeddingSpy).toHaveBeenCalledWith(
        [0.1, 0.2],
        'ORDER BY distance ASC',
      );
    });

    it('passes through orderByClause to embedding config', () => {
      const result = helper.buildSearchQueryConfig(
        undefined,
        undefined,
        'ORDER BY name ASC',
      );
      expect(result.searchOrderBy).toBe('ORDER BY name ASC');
    });
  });
});
