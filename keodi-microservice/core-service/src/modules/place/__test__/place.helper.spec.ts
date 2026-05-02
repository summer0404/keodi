import { HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
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
      expect(() => helper.parseOpeningHourTime('not-a-time')).toThrow(RpcException);
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
        helper.normalizeOpeningHours([{ dayOfWeek: 7, openTime: '09:00', closeTime: '18:00' }]),
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
        helper.normalizeOpeningHours([{ dayOfWeek: 3, openTime: '18:00', closeTime: '09:00' }]),
      ).toThrow(RpcException);
    });

    it('returns correct parsed dates for valid opening hours', () => {
      const result = helper.normalizeOpeningHours([{ dayOfWeek: 1, openTime: '08:00', closeTime: '22:00' }]);
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
      expect(helper.buildFullAddress('123 Main St', 'Ward 1', 'Ho Chi Minh', 'VN')).toBe(
        '123 Main St, Ward 1, Ho Chi Minh, VN',
      );
    });

    it('trims whitespace from each part', () => {
      expect(helper.buildFullAddress('  Street  ', '  Ward  ', '  City  ', '  VN  ')).toBe(
        'Street, Ward, City, VN',
      );
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
});
