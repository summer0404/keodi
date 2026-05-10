import { parseArray, parseStringArray } from '../type.util';

describe('parseArray', () => {
  describe('falsy / sentinel values return undefined', () => {
    it('should return undefined for null', () => {
      expect(parseArray(null)).toBeUndefined();
    });

    it('should return undefined for undefined', () => {
      expect(parseArray(undefined)).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(parseArray('')).toBeUndefined();
    });

    it('should return undefined for string "undefined"', () => {
      expect(parseArray('undefined')).toBeUndefined();
    });

    it('should return undefined for string "null"', () => {
      expect(parseArray('null')).toBeUndefined();
    });
  });

  describe('array passthrough', () => {
    it('should return the value as-is when already an array', () => {
      const input = [1, 2, 3];
      expect(parseArray(input)).toBe(input);
    });

    it('should return empty array as-is when already an array', () => {
      const input: any[] = [];
      expect(parseArray(input)).toBe(input);
    });

    it('should return array of strings as-is', () => {
      const input = ['a', 'b', 'c'];
      expect(parseArray(input)).toBe(input);
    });
  });

  describe('JSON string parsing', () => {
    it('should parse a valid JSON array string', () => {
      expect(parseArray('["a","b","c"]')).toEqual(['a', 'b', 'c']);
    });

    it('should parse a JSON array with numbers', () => {
      expect(parseArray('[1,2,3]')).toEqual([1, 2, 3]);
    });

    it('should wrap a JSON scalar in an array', () => {
      expect(parseArray('"single"')).toEqual(['single']);
    });

    it('should replace single quotes and parse as JSON array', () => {
      expect(parseArray("['a','b']")).toEqual(['a', 'b']);
    });
  });

  describe('comma-split fallback', () => {
    it('should split comma-separated string into array', () => {
      expect(parseArray('a,b,c')).toEqual(['a', 'b', 'c']);
    });

    it('should trim whitespace around commas', () => {
      expect(parseArray('a , b , c')).toEqual(['a', 'b', 'c']);
    });

    it('should filter out empty segments from split', () => {
      expect(parseArray('a,,b')).toEqual(['a', 'b']);
    });

    it('should return single-element array for string with no commas', () => {
      expect(parseArray('hello')).toEqual(['hello']);
    });
  });

  describe('non-string, non-array fallback', () => {
    it('should wrap a number in an array', () => {
      expect(parseArray(42)).toEqual([42]);
    });

    it('should wrap an object in an array', () => {
      const obj = { key: 'value' };
      expect(parseArray(obj)).toEqual([obj]);
    });
  });
});

describe('parseStringArray', () => {
  it('should return undefined for falsy value', () => {
    expect(parseStringArray(null)).toBeUndefined();
    expect(parseStringArray(undefined)).toBeUndefined();
    expect(parseStringArray('')).toBeUndefined();
  });

  it('should return undefined for "undefined" string', () => {
    expect(parseStringArray('undefined')).toBeUndefined();
  });

  it('should return undefined for "null" string', () => {
    expect(parseStringArray('null')).toBeUndefined();
  });

  it('should convert all elements to strings', () => {
    expect(parseStringArray([1, 2, 3])).toEqual(['1', '2', '3']);
  });

  it('should parse comma-separated string and return string array', () => {
    expect(parseStringArray('a,b,c')).toEqual(['a', 'b', 'c']);
  });

  it('should parse JSON array string and convert elements to strings', () => {
    expect(parseStringArray('[1, 2, 3]')).toEqual(['1', '2', '3']);
  });

  it('should return string array from already-string array', () => {
    expect(parseStringArray(['x', 'y'])).toEqual(['x', 'y']);
  });

  it('should return undefined when parseArray result is empty array', () => {
    // An empty array input is passed through by parseArray, then parseStringArray
    // checks arr?.length -> 0 which is falsy, so returns undefined
    const result = parseStringArray([]);
    expect(result).toBeUndefined();
  });
});
