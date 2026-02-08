import { parseViewCount } from '@/lib/parser';

describe('parseViewCount', () => {
  describe('basic numbers', () => {
    it('parses plain integers', () => {
      expect(parseViewCount('1234')).toBe(1234);
      expect(parseViewCount('0')).toBe(0);
      expect(parseViewCount('999999')).toBe(999999);
    });

    it('parses numbers with commas', () => {
      expect(parseViewCount('1,234')).toBe(1234);
      expect(parseViewCount('1,234,567')).toBe(1234567);
      expect(parseViewCount('12,345,678,901')).toBe(12345678901);
    });

    it('handles whitespace', () => {
      expect(parseViewCount('  1234  ')).toBe(1234);
      expect(parseViewCount('\t5678\n')).toBe(5678);
    });
  });

  describe('K suffix (thousands)', () => {
    it('parses whole K values', () => {
      expect(parseViewCount('1K')).toBe(1000);
      expect(parseViewCount('5K')).toBe(5000);
      expect(parseViewCount('999K')).toBe(999000);
    });

    it('parses decimal K values', () => {
      expect(parseViewCount('1.5K')).toBe(1500);
      expect(parseViewCount('12.3K')).toBe(12300);
      expect(parseViewCount('0.5K')).toBe(500);
    });

    it('handles lowercase k', () => {
      expect(parseViewCount('1k')).toBe(1000);
      expect(parseViewCount('12.3k')).toBe(12300);
    });

    it('handles space before K', () => {
      expect(parseViewCount('1.5 K')).toBe(1500);
      expect(parseViewCount('12 K')).toBe(12000);
    });
  });

  describe('M suffix (millions)', () => {
    it('parses whole M values', () => {
      expect(parseViewCount('1M')).toBe(1000000);
      expect(parseViewCount('4M')).toBe(4000000);
      expect(parseViewCount('100M')).toBe(100000000);
    });

    it('parses decimal M values', () => {
      expect(parseViewCount('1.5M')).toBe(1500000);
      expect(parseViewCount('2.75M')).toBe(2750000);
      expect(parseViewCount('0.1M')).toBe(100000);
    });

    it('handles lowercase m', () => {
      expect(parseViewCount('4m')).toBe(4000000);
      expect(parseViewCount('1.2m')).toBe(1200000);
    });
  });

  describe('B suffix (billions)', () => {
    it('parses whole B values', () => {
      expect(parseViewCount('1B')).toBe(1000000000);
      expect(parseViewCount('5B')).toBe(5000000000);
    });

    it('parses decimal B values', () => {
      expect(parseViewCount('1.5B')).toBe(1500000000);
      expect(parseViewCount('2.3B')).toBe(2300000000);
    });

    it('handles lowercase b', () => {
      expect(parseViewCount('1b')).toBe(1000000000);
    });
  });

  describe('edge cases', () => {
    it('returns null for empty string', () => {
      expect(parseViewCount('')).toBeNull();
    });

    it('returns null for invalid input', () => {
      expect(parseViewCount('abc')).toBeNull();
      expect(parseViewCount('K')).toBeNull();
      expect(parseViewCount('1.2.3K')).toBeNull();
    });

    it('returns null for undefined-like values', () => {
      expect(parseViewCount('null')).toBeNull();
      expect(parseViewCount('undefined')).toBeNull();
    });

    it('handles mixed case', () => {
      expect(parseViewCount('12.3K')).toBe(12300);
      expect(parseViewCount('12.3k')).toBe(12300);
    });
  });

  describe('real-world examples', () => {
    it('parses typical GIPHY view counts', () => {
      expect(parseViewCount('12.3K')).toBe(12300);
      expect(parseViewCount('4M')).toBe(4000000);
      expect(parseViewCount('1,234')).toBe(1234);
      expect(parseViewCount('567.8M')).toBe(567800000);
      expect(parseViewCount('1.2B')).toBe(1200000000);
    });
  });
});
