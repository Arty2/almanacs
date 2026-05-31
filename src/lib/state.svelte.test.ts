import { describe, it, expect, beforeEach } from 'vitest';
import {
  events,
  config,
  addScratchpadEvent,
  createImportedLane,
  moveEventToLane,
} from './state.svelte';
import { SCRATCHPAD_FEED_ID } from './types';
import { SCRATCHPAD_KEY } from './scratchpad';

function resetState(): void {
  localStorage.clear();
  // Drop any imported lanes; keep only the Draft lane and clear its events.
  config.feeds = config.feeds.filter((f) => f.id === SCRATCHPAD_FEED_ID);
  for (const key of Object.keys(events.byFeed)) delete events.byFeed[key];
  events.byFeed[SCRATCHPAD_FEED_ID] = [];
}

beforeEach(resetState);

describe('moveEventToLane', () => {
  it('moves an event between local lanes, keeping its uid and persisting both', () => {
    const ev = addScratchpadEvent({
      title: 'Trip',
      start: new Date('2026-02-01T10:00:00Z'),
      end: new Date('2026-02-01T11:00:00Z'),
      allDay: false,
    });
    const lane = createImportedLane('Imported', []);

    moveEventToLane(ev.uid, lane.id);

    expect(events.byFeed[SCRATCHPAD_FEED_ID]).toHaveLength(0);
    expect(events.byFeed[lane.id]).toHaveLength(1);
    const moved = events.byFeed[lane.id]![0]!;
    expect(moved.uid).toBe(ev.uid);
    expect(moved.feedId).toBe(lane.id);

    // Both lanes are persisted to their own localStorage keys.
    const laneKey = SCRATCHPAD_KEY + ':' + (lane.source as { id: string }).id;
    expect(JSON.parse(localStorage.getItem(laneKey)!)).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem(SCRATCHPAD_KEY)!)).toHaveLength(0);
  });

  it('keeps destination events sorted by start time', () => {
    const lane = createImportedLane('Imported', []);
    addScratchpadEvent({
      title: 'Existing',
      start: new Date('2026-03-01T00:00:00Z'),
      end: new Date('2026-03-01T01:00:00Z'),
      allDay: false,
    }, lane.id);
    const early = addScratchpadEvent({
      title: 'Early',
      start: new Date('2026-01-01T00:00:00Z'),
      end: new Date('2026-01-01T01:00:00Z'),
      allDay: false,
    });

    moveEventToLane(early.uid, lane.id);

    expect(events.byFeed[lane.id]!.map((e) => e.title)).toEqual(['Early', 'Existing']);
  });

  it('is a no-op when source equals destination', () => {
    const ev = addScratchpadEvent({
      title: 'Stay',
      start: new Date('2026-02-01T10:00:00Z'),
      end: new Date('2026-02-01T11:00:00Z'),
      allDay: false,
    });
    moveEventToLane(ev.uid, SCRATCHPAD_FEED_ID);
    expect(events.byFeed[SCRATCHPAD_FEED_ID]).toHaveLength(1);
  });

  it('refuses non-local destinations', () => {
    const ev = addScratchpadEvent({
      title: 'Stay',
      start: new Date('2026-02-01T10:00:00Z'),
      end: new Date('2026-02-01T11:00:00Z'),
      allDay: false,
    });
    moveEventToLane(ev.uid, 'user:abc123');
    expect(events.byFeed[SCRATCHPAD_FEED_ID]).toHaveLength(1);
    expect(events.byFeed['user:abc123']).toBeUndefined();
  });
});
