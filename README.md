# Calendar Timeline

Horizontal-scrolling, multi-feed calendar viewer. Black-and-white, e-ink friendly. Reads any ICS feed (Google, iCloud, Outlook, Fastmail, Nextcloud, etc.).

Ships with a default **Greek Bank Holidays** subscription (Office Holidays' public ICS feed at `https://www.officeholidays.com/ics/greece`) so a fresh deploy renders real events immediately.

## Deploy

1. Fork or clone this repo.
2. Push to a new GitHub repo.
3. Import the repo into Vercel — it auto-detects Vite, no config needed.
4. (Optional) Add secret feeds as environment variables:
   - `SECRET_FEED_IDS` — comma-separated, e.g. `work,family`.
   - For each id: `FEED_<ID>_URL` and `FEED_<ID>_NAME` (uppercase id).
5. Deploy. Site is at your Vercel URL.

The Greek bank holidays feed is fetched through the bundled `/api/ics` proxy. No env vars are required for it to work.

## Use

- **Zoom**: month / quarter / 6-month / year buttons in the toolbar.
- **Scroll**: drag horizontally for time, vertically for calendars. Header and row labels stay pinned.
- **Search**: type in the search box. Non-matches are dimmed (1-bit stipple).
- **Add a calendar**: open Settings, paste an ICS URL, give it a name.
- **Reorder rows**: ↑ / ↓ buttons in Settings.
- **Collapse a row**: click the ▾ next to its name. Collapsed rows show event density as dots.
- **Rename a row**: click the name and edit.
- **Open an event**: tap or click the pill.
- **Refresh**: Refresh button in the toolbar.
- **Backup config**: Settings → Export.
- **Restore**: Settings → Import.

User-added calendars live in localStorage on this device only. Use Export/Import to move them.

## Local development

    npm install
    vercel dev           # frontend + proxy (the proxy is required for any feed,
                         # including the default Greek bank holidays)
    npm run dev          # frontend only — useful for UI work, but no events
                         # will load without the proxy

## Tests

    npm test
