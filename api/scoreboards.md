# Scoreboards

Reading boards. Every read is a `GET`, board data is public (no player auth needed beyond your game credentials), and responses are edge-cached for ~30 seconds.

## The global leaderboard

```
GET /leaderboard?sort={score|streak}&limit={n}
```

```bash
curl "https://api.cheddaboards.com/leaderboard?sort=score&limit=100" \
  -H "X-API-Key: cb_my-game_xxxxxxxxx" \
  -H "X-Game-ID: my-game"
```

```json
{
  "ok": true,
  "data": {
    "leaderboard": [
      { "rank": 1, "nickname": "Chedz", "score": 5148898, "streak": 4, "authType": "external" },
      { "rank": 2, "nickname": "Player_1504", "score": 151732, "streak": 7, "authType": "external" }
    ],
    "total": 2
  }
}
```

`sort` is `score` (default) or `streak`. Each entry carries `rank`, `nickname`, `score`, `streak`, and `authType` (how the player signed in — `external` for anonymous / API-key play). This reads the game's global fan-out board; for a specific board use the endpoint below.

## A specific board

```
GET /games/{gameId}/scoreboards/{scoreboardId}?limit={n}
```

Works for any board — all-time, a timed board, or a targeted category board — they read identically:

```bash
curl "https://api.cheddaboards.com/games/my-game/scoreboards/weekly-scoreboard?limit=100" \
  -H "X-API-Key: cb_my-game_xxxxxxxxx" \
  -H "X-Game-ID: my-game"
```

The response includes the board's `config` (name, reset period, sort settings, period timestamps) alongside its ranked `entries`.

### Reading straight from the chain

The same board read is served directly by the canister, no proxy involved and no API key needed:

```bash
curl "https://fdvph-sqaaa-aaaap-qqc4a-cai.raw.icp0.io/games/my-game/scoreboards/weekly-scoreboard?limit=100"
```

Byte-identical JSON, browser-safe (`Access-Control-Allow-Origin: *`). Use it for read-only surfaces — kiosks, overlays, companion pages — that should keep working regardless of the API layer. See [the quick start](/quickstart/rest#reading-boards-straight-from-the-chain).

## List a game's boards

```
GET /games/{gameId}/scoreboards
```

Returns every board configured for the game — fan-out and targeted, timed and all-time — with each board's config. Use it to discover board IDs rather than hard-coding them.

## Archives

When a timed board resets, its final standings are archived. Read them back:

| Endpoint | Returns |
|----------|---------|
| `GET /games/{gameId}/scoreboards/{id}/archives` | List of archived periods for a board |
| `GET /games/{gameId}/scoreboards/{id}/archives/latest` | The most recent archive |
| `GET /archives/{archiveId}` | One specific archive (`gameId:scoreboardId:timestamp`) |
| `GET /games/{gameId}/archives/stats` | Archive statistics for the game |

Full treatment of resets, retention, and archive display: [Timed leaderboards](/concepts/timed-leaderboards).

## Caching & polling

Board reads are edge-cached for about 30 seconds, so polling faster than that returns the same data. If you refresh a board on screen, a 30-second interval plus a refresh after the player's own submit is the pattern the official SDKs use — it keeps you well clear of any rate concern and off the proxy for reads that haven't changed.

## Notes

- A `404` on a board lookup is normal — it means the board isn't configured for the game.
- `limit` caps how many entries come back; omit it for the default.
- Board and game IDs in the path must be 1–64 chars of `[A-Za-z0-9_-]` or the request is rejected with a `400`.

**See also:** [Scores](/api/scores) · [Category boards](/concepts/category-boards) · [Timed leaderboards](/concepts/timed-leaderboards) · [REST quick start](/quickstart/rest)