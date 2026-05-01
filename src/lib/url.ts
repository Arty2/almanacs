import type { DateFormat, Locale, Theme, Zoom } from './types';

export type UrlState = {
  zoom: Zoom | null;
  locale: Locale | null;
  dateFormat: DateFormat | null;
  theme: Theme | null;
};

const ZOOM_MAP: Record<string, Zoom> = {
  '1m': 'month',
  '3m': 'quarter',
  '6m': 'half-year',
  '1y': 'year',
};
const ZOOM_MAP_REVERSE: Record<Zoom, string> = {
  month: '1m',
  quarter: '3m',
  'half-year': '6m',
  year: '1y',
};

const LOCALES: Locale[] = ['en', 'el'];
const FORMATS: DateFormat[] = ['YMD', 'DMY', 'MDY'];
const THEMES: Theme[] = ['system', 'light', 'dark'];

export function readUrlState(search: string = typeof location !== 'undefined' ? location.search : ''): UrlState {
  const params = new URLSearchParams(search);
  const z = params.get('z')?.toLowerCase();
  const loc = params.get('loc')?.toLowerCase();
  const d = params.get('d')?.toUpperCase();
  const t = params.get('t')?.toLowerCase();
  return {
    zoom: z && ZOOM_MAP[z] ? ZOOM_MAP[z] : null,
    locale: loc && LOCALES.includes(loc as Locale) ? (loc as Locale) : null,
    dateFormat: d && FORMATS.includes(d as DateFormat) ? (d as DateFormat) : null,
    theme: t && THEMES.includes(t as Theme) ? (t as Theme) : null,
  };
}

export function writeUrlState(state: {
  zoom: Zoom;
  locale: Locale;
  dateFormat: DateFormat;
  theme: Theme;
}): string {
  const params = new URLSearchParams();
  params.set('z', ZOOM_MAP_REVERSE[state.zoom]);
  params.set('loc', state.locale);
  params.set('d', state.dateFormat);
  params.set('t', state.theme);
  return '?' + params.toString();
}

export function applyUrlState(state: {
  zoom: Zoom;
  locale: Locale;
  dateFormat: DateFormat;
  theme: Theme;
}): void {
  if (typeof history === 'undefined') return;
  const next = writeUrlState(state);
  if (location.search === next) return;
  history.replaceState(null, '', next + location.hash);
}
