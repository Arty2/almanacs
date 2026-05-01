import type { AppConfig, CalendarFeed } from './types';
import { SCHEMA_VERSION } from './types';

export const STORAGE_KEY = 'calendar-timeline:config';

export const GREEK_HOLIDAYS_URL = 'https://www.officeholidays.com/ics/greece';

export function defaultConfig(): AppConfig {
  const demoFeed: CalendarFeed = {
    id: 'user:greek-bank-holidays',
    source: { kind: 'user', url: GREEK_HOLIDAYS_URL },
    name: 'Greek Bank Holidays',
    collapsed: false,
    order: 0,
  };
  return {
    feeds: [demoFeed],
    refreshIntervalMs: 15 * 60 * 1000,
    schemaVersion: SCHEMA_VERSION,
    theme: 'system',
    locale: 'en',
    dateFormat: 'YMD',
    rules: [],
  };
}

function migrate(parsed: Record<string, unknown>): AppConfig {
  const base = defaultConfig();
  const version = typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : 1;
  const feeds = Array.isArray(parsed.feeds) ? (parsed.feeds as CalendarFeed[]) : base.feeds;
  const refreshIntervalMs =
    typeof parsed.refreshIntervalMs === 'number' ? parsed.refreshIntervalMs : base.refreshIntervalMs;
  if (version >= SCHEMA_VERSION) {
    return {
      feeds,
      refreshIntervalMs,
      schemaVersion: SCHEMA_VERSION,
      theme: (parsed.theme as AppConfig['theme']) ?? base.theme,
      locale: (parsed.locale as AppConfig['locale']) ?? base.locale,
      dateFormat: (parsed.dateFormat as AppConfig['dateFormat']) ?? base.dateFormat,
      rules: Array.isArray(parsed.rules) ? (parsed.rules as AppConfig['rules']) : base.rules,
    };
  }
  return { ...base, feeds, refreshIntervalMs };
}

export function loadConfig(): AppConfig {
  if (typeof localStorage === 'undefined') return defaultConfig();
  const raw = localStorage.getItem(STORAGE_KEY);
  const legacy = raw ? null : localStorage.getItem('calendar-timeline:config:v1');
  const text = raw ?? legacy;
  if (!text) return defaultConfig();
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null) return defaultConfig();
    return migrate(parsed as Record<string, unknown>);
  } catch {
    return defaultConfig();
  }
}

export function saveConfig(config: AppConfig): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function exportConfig(config: AppConfig): string {
  return JSON.stringify(config, null, 2);
}

export function importConfig(json: string): AppConfig {
  const parsed = JSON.parse(json);
  if (typeof parsed !== 'object' || parsed === null) throw new Error('Invalid config');
  if (!Array.isArray(parsed.feeds)) throw new Error('Invalid feeds');
  const version = typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : 0;
  if (version !== SCHEMA_VERSION && version !== 1) {
    throw new Error('Unsupported schema version: ' + parsed.schemaVersion);
  }
  return migrate(parsed as Record<string, unknown>);
}
