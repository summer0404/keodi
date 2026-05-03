import { getSearchRadiusKm } from '../search.utils';
import { SEARCH_RADIUS_KM_MAP } from '../../constants/setting.constant';

describe('getSearchRadiusKm', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns KM_5 default when radius is undefined', () => {
    expect(getSearchRadiusKm(undefined)).toBe(SEARCH_RADIUS_KM_MAP.KM_5);
  });

  it('returns KM_2 when radius is "KM_2"', () => {
    expect(getSearchRadiusKm('KM_2')).toBe(SEARCH_RADIUS_KM_MAP.KM_2);
  });

  it('returns KM_5 when radius is "KM_5"', () => {
    expect(getSearchRadiusKm('KM_5')).toBe(SEARCH_RADIUS_KM_MAP.KM_5);
  });

  it('returns KM_10 when radius is "KM_10"', () => {
    expect(getSearchRadiusKm('KM_10')).toBe(SEARCH_RADIUS_KM_MAP.KM_10);
  });

  it('returns KM_20 when radius is "KM_20"', () => {
    expect(getSearchRadiusKm('KM_20')).toBe(SEARCH_RADIUS_KM_MAP.KM_20);
  });

  it('falls back to KM_5 for an unknown key', () => {
    expect(getSearchRadiusKm('KM_999')).toBe(SEARCH_RADIUS_KM_MAP.KM_5);
  });

  it('falls back to KM_5 for an empty string', () => {
    // empty string is falsy, treated like undefined
    expect(getSearchRadiusKm('')).toBe(SEARCH_RADIUS_KM_MAP.KM_5);
  });
});
