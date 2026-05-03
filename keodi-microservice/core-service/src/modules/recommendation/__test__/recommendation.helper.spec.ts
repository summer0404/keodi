import { RecommendationHelper } from '../recommendation.helper';

describe('RecommendationHelper', () => {
  let helper: RecommendationHelper;

  beforeEach(() => {
    jest.clearAllMocks();
    helper = new RecommendationHelper();
  });

  // ──────────────────────────────────────────────
  // deduplicatePlaces
  // ──────────────────────────────────────────────
  describe('deduplicatePlaces', () => {
    it('returns empty array for empty input', () => {
      expect(helper.deduplicatePlaces([])).toEqual([]);
    });

    it('removes duplicate places keeping the first occurrence', () => {
      const places = [
        { id: 'p1', name: 'Place A' } as any,
        { id: 'p2', name: 'Place B' } as any,
        { id: 'p1', name: 'Place A Duplicate' } as any,
      ];

      const result = helper.deduplicatePlaces(places);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Place A');
      expect(result[1].name).toBe('Place B');
    });

    it('preserves order of first occurrences', () => {
      const places = [
        { id: 'p3', name: 'C' } as any,
        { id: 'p1', name: 'A' } as any,
        { id: 'p2', name: 'B' } as any,
        { id: 'p3', name: 'C-dup' } as any,
      ];

      const result = helper.deduplicatePlaces(places);

      expect(result.map((p) => p.id)).toEqual(['p3', 'p1', 'p2']);
    });

    it('returns all places when there are no duplicates', () => {
      const places = [{ id: 'a' } as any, { id: 'b' } as any, { id: 'c' } as any];
      expect(helper.deduplicatePlaces(places)).toHaveLength(3);
    });
  });

  // ──────────────────────────────────────────────
  // shufflePlaces
  // ──────────────────────────────────────────────
  describe('shufflePlaces', () => {
    it('returns array of the same length', () => {
      const places = [{ id: 'a' } as any, { id: 'b' } as any, { id: 'c' } as any];
      expect(helper.shufflePlaces(places)).toHaveLength(3);
    });

    it('does not mutate the original array', () => {
      const places = [{ id: 'a' } as any, { id: 'b' } as any];
      const original = [...places];
      helper.shufflePlaces(places);
      expect(places).toEqual(original);
    });

    it('returns empty array for empty input', () => {
      expect(helper.shufflePlaces([])).toEqual([]);
    });
  });

  // ──────────────────────────────────────────────
  // calculateCentroid
  // ──────────────────────────────────────────────
  describe('calculateCentroid', () => {
    it('calculates correct centroid for two locations', () => {
      const locations = [
        { memberId: 'm1', latitude: 10.0, longitude: 106.0 },
        { memberId: 'm2', latitude: 12.0, longitude: 108.0 },
      ];

      const result = helper.calculateCentroid(locations);

      expect(result.latitude).toBeCloseTo(11.0);
      expect(result.longitude).toBeCloseTo(107.0);
    });

    it('returns the single location as centroid', () => {
      const result = helper.calculateCentroid([{ memberId: 'm1', latitude: 10.5, longitude: 106.5 }]);

      expect(result.latitude).toBeCloseTo(10.5);
      expect(result.longitude).toBeCloseTo(106.5);
    });
  });

  // ──────────────────────────────────────────────
  // parseSessionLocation
  // ──────────────────────────────────────────────
  describe('parseSessionLocation', () => {
    it('parses valid location JSON', () => {
      const raw = JSON.stringify({ latitude: 10.0, longitude: 106.0 });
      const result = helper.parseSessionLocation('session:123:member:m1', raw);

      expect(result).not.toBeNull();
      expect(result!.latitude).toBe(10.0);
      expect(result!.longitude).toBe(106.0);
      expect(result!.memberId).toBe('m1');
    });

    it('returns null for invalid JSON', () => {
      const result = helper.parseSessionLocation('key:m1', 'not-json');
      expect(result).toBeNull();
    });

    it('returns null when latitude is missing', () => {
      const raw = JSON.stringify({ longitude: 106.0 });
      const result = helper.parseSessionLocation('key:m1', raw);
      expect(result).toBeNull();
    });

    it('returns null when longitude is not a number', () => {
      const raw = JSON.stringify({ latitude: 10.0, longitude: 'bad' });
      const result = helper.parseSessionLocation('key:m1', raw);
      expect(result).toBeNull();
    });
  });

  // ──────────────────────────────────────────────
  // getBoundingBoxCondition
  // ──────────────────────────────────────────────
  describe('getBoundingBoxCondition', () => {
    it('returns bounding box with gte/lte for latitude and longitude', () => {
      const result = helper.getBoundingBoxCondition(10.0, 106.0, 5);

      expect(result.latitude.gte).toBeLessThan(10.0);
      expect(result.latitude.lte).toBeGreaterThan(10.0);
      expect(result.longitude.gte).toBeLessThan(106.0);
      expect(result.longitude.lte).toBeGreaterThan(106.0);
    });

    it('larger radius produces wider bounding box', () => {
      const small = helper.getBoundingBoxCondition(10.0, 106.0, 2);
      const large = helper.getBoundingBoxCondition(10.0, 106.0, 20);

      expect(large.latitude.lte - large.latitude.gte).toBeGreaterThan(
        small.latitude.lte - small.latitude.gte,
      );
    });
  });
});
