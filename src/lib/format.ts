import type { DateFormat, Locale } from './types';

const MONTH_LONG: Record<Locale, string[]> = {
  en: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ],
  el: [
    'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος',
    'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος',
  ],
};

const MONTH_SHORT: Record<Locale, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  el: ['Ιαν', 'Φεβ', 'Μάρ', 'Απρ', 'Μάι', 'Ιούν', 'Ιούλ', 'Αύγ', 'Σεπ', 'Οκτ', 'Νοέ', 'Δεκ'],
};

const DAY_INITIAL: Record<Locale, string[]> = {
  en: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  el: ['Κ', 'Δ', 'Τ', 'Τ', 'Π', 'Π', 'Σ'],
};

const DAY_LONG: Record<Locale, string[]> = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  el: ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'],
};

export function formatMonth(d: Date, locale: Locale, length: 'long' | 'short' = 'short'): string {
  const m = d.getUTCMonth();
  const table = length === 'long' ? MONTH_LONG : MONTH_SHORT;
  return table[locale][m] ?? '';
}

export function formatDayInitial(d: Date, locale: Locale): string {
  return DAY_INITIAL[locale][d.getUTCDay()] ?? '';
}

export function formatWeekday(d: Date, locale: Locale): string {
  return DAY_LONG[locale][d.getUTCDay()] ?? '';
}

export function isWeekend(d: Date): boolean {
  const dow = d.getUTCDay();
  return dow === 0 || dow === 6;
}

function pad(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

export function formatDate(d: Date, format: DateFormat, locale: Locale): string {
  const day = pad(d.getUTCDate());
  const month = formatMonth(d, locale, 'short');
  const year = String(d.getUTCFullYear());
  switch (format) {
    case 'YMD':
      return year + ' ' + month + ' ' + day;
    case 'DMY':
      return day + ' ' + month + ' ' + year;
    case 'MDY':
      return month + ' ' + day + ' ' + year;
  }
}

export function formatDateLong(d: Date, locale: Locale): string {
  const weekday = formatWeekday(d, locale);
  const day = d.getUTCDate();
  const month = formatMonth(d, locale, 'long');
  const year = d.getUTCFullYear();
  return weekday + ', ' + day + ' ' + month + ' ' + year;
}
