import { describe, it, expect } from 'vitest';
import { exportConfig, importConfig, defaultConfig } from './storage';
import { SCHEMA_VERSION } from './types';

describe('config import/export', () => {
  it('round-trips the default config', () => {
    const original = defaultConfig();
    const json = exportConfig(original);
    const restored = importConfig(json);
    expect(restored.feeds.length).toBe(original.feeds.length);
    expect(restored.refreshIntervalMs).toBe(original.refreshIntervalMs);
    expect(restored.theme).toBe(original.theme);
    expect(restored.locale).toBe(original.locale);
  });

  it('throws on malformed JSON', () => {
    expect(() => importConfig('not json')).toThrow();
  });

  it('throws on wrong schema version', () => {
    const bad = JSON.stringify({ schemaVersion: 999, feeds: [] });
    expect(() => importConfig(bad)).toThrow(/schema/i);
  });

  it('migrates v1 config to v2 with defaults for new fields', () => {
    const v1 = JSON.stringify({
      schemaVersion: 1,
      feeds: [
        {
          id: 'user:test',
          source: { kind: 'user', url: 'https://example.com/cal.ics' },
          name: 'Test',
          collapsed: false,
          order: 0,
        },
      ],
      refreshIntervalMs: 60_000,
    });
    const restored = importConfig(v1);
    expect(restored.schemaVersion).toBe(SCHEMA_VERSION);
    expect(restored.feeds.length).toBe(1);
    expect(restored.refreshIntervalMs).toBe(60_000);
    expect(restored.theme).toBe('system');
    expect(restored.locale).toBe('en');
    expect(restored.dateFormat).toBe('YMD');
    expect(restored.rules).toEqual([]);
  });
});
