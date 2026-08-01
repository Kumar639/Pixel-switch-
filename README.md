# PixelSwitch comments and activity API

Provides shared comments, one-level replies, helpful votes and privacy-safe aggregate conversion/download counters using Express and SQLite.

```bash
cp .env.example .env
npm install
npm start
```

The default API base is `http://localhost:8787/api`.

Website configuration:

```js
window.PIXELSWITCH_CONFIG = {
  commentsApiUrl: 'https://your-api.example/api',
  contactApiUrl: '',
  activityApiUrl: 'https://your-api.example/api'
};
```

Activity endpoints:

- `GET /api/activity` — totals and per-tool counts
- `POST /api/activity` — increment a conversion or download event

The activity endpoint does not receive filenames or file contents. Add production monitoring, backups, stricter origin rules, moderation, spam controls and a privacy policy before a large launch.
