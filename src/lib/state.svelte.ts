import type { AppConfig, DisplayEvent, ParsedEvent, Zoom } from './types';
import { loadConfig } from './storage';
import { applyRules } from './rules';

export const config = $state<AppConfig>(loadConfig());

export const events = $state<{ byFeed: Record<string, ParsedEvent[]> }>({ byFeed: {} });

export const zoom = $state<{ value: Zoom }>({ value: 'month' });

export const search = $state<{ query: string; currentIndex: number }>({
  query: '',
  currentIndex: 0,
});

export const ui = $state<{
  modalEvent: DisplayEvent | null;
  settingsOpen: boolean;
  loading: boolean;
  error: string | null;
}>({
  modalEvent: null,
  settingsOpen: false,
  loading: false,
  error: null,
});

export function displayEventsFor(feedId: string): DisplayEvent[] {
  const raw = events.byFeed[feedId] ?? [];
  return applyRules(raw, config.rules);
}
