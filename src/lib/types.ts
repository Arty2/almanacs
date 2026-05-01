export type FeedSource =
  | { kind: 'secret'; id: string }
  | { kind: 'user'; url: string };

export type CalendarFeed = {
  id: string;
  source: FeedSource;
  name: string;
  collapsed: boolean;
  order: number;
};

export type ParsedEvent = {
  uid: string;
  feedId: string;
  title: string;
  description: string;
  descriptionSnippet: string;
  location: string;
  start: Date;
  end: Date;
  allDay: boolean;
  url?: string;
};

export type StyleVariant =
  | 'none'
  | 'inverted-dashed'
  | 'inverted-strike'
  | 'hidden'
  | 'muted'
  | 'highlight';

export type DisplayEvent = ParsedEvent & {
  displayTitle: string;
  displayDescription: string;
  displayDescriptionSnippet: string;
  displayLocation: string;
  styleVariant: StyleVariant;
  hidden: boolean;
};

export type LaneEvent = DisplayEvent & {
  lane: number;
  leftPx: number;
  widthPx: number;
};

export type Zoom = 'month' | 'quarter' | 'half-year' | 'year';

export type Theme = 'system' | 'light' | 'dark';

export type Locale = 'en' | 'el';

export type DateFormat = 'YMD' | 'DMY' | 'MDY';

export type FindReplaceRule = {
  id: string;
  find: string;
  replace: string;
  style: StyleVariant;
};

export type AppConfig = {
  feeds: CalendarFeed[];
  refreshIntervalMs: number;
  schemaVersion: number;
  theme: Theme;
  locale: Locale;
  dateFormat: DateFormat;
  rules: FindReplaceRule[];
};

export const SCHEMA_VERSION = 2;
