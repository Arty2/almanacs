import { describe, it, expect } from 'vitest';
import { formatDate, formatMonth, formatDayInitial, isWeekend } from './format';

const may1 = new Date('2026-05-01T00:00:00Z'); // Friday

describe('formatDate', () => {
  it('renders YMD in English', () => {
    expect(formatDate(may1, 'YMD', 'en')).toBe('2026 May 01');
  });
  it('renders DMY in English', () => {
    expect(formatDate(may1, 'DMY', 'en')).toBe('01 May 2026');
  });
  it('renders MDY in English', () => {
    expect(formatDate(may1, 'MDY', 'en')).toBe('May 01 2026');
  });
  it('renders DMY in Greek', () => {
    expect(formatDate(may1, 'DMY', 'el')).toBe('01 Μάι 2026');
  });
});

describe('formatMonth', () => {
  it('returns short Greek month', () => {
    expect(formatMonth(may1, 'el', 'short')).toBe('Μάι');
  });
  it('returns long English month', () => {
    expect(formatMonth(may1, 'en', 'long')).toBe('May');
  });
});

describe('formatDayInitial', () => {
  it('returns Greek "Π" for Friday', () => {
    expect(formatDayInitial(may1, 'el')).toBe('Π');
  });
  it('returns English "F" for Friday', () => {
    expect(formatDayInitial(may1, 'en')).toBe('F');
  });
});

describe('isWeekend', () => {
  it('is false for Friday', () => {
    expect(isWeekend(may1)).toBe(false);
  });
  it('is true for Saturday', () => {
    expect(isWeekend(new Date('2026-05-02T00:00:00Z'))).toBe(true);
  });
  it('is true for Sunday', () => {
    expect(isWeekend(new Date('2026-05-03T00:00:00Z'))).toBe(true);
  });
});
