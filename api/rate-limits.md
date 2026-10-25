# Rate limits

A normal game never hits these. They exist to stop runaway loops, bots and spam, and they're set well above what a game-over loop, a level-select screen or an achievement burst needs.

There are two layers:

- **The canister throttle**: one score submit per player per board every 2 seconds. Rejected with `400` and a message telling you to wait.
- **API limits**: everything below. Rejected with `429 Too Many Requests` and a `Retry-After` header, in seconds.

## Score submits

| Limit | Applies to | Over the limit |
|---|---|---|
| 1 submit per player per board every 2 s | Every submit | `400`, wait and resend |
| 120 submits per player per game per hour | API-key and signed-in submits | `429` "Too many score submissions for this player. Submit once per game over." |
| 60 submits per minute per client IP | All games combined | `429` "Too many score submissions from this address" |

The 2-second throttle is keyed per board, so a run that submits to a level board and a shared `runs` board back to back is fine. The hourly cap is the one a forgotten debug build (a submit on every tap or every frame) will hit first.

## API key budget

Each game's API key has a request budget. Only requests that write count against it: `POST /scores`, `POST /achievements` and `PUT /players/{id}/nickname`. Reads, play-session calls and `/health` are free.

| Tier | Per minute | Per hour |
|---|---|---|
| Free (every hosted key today) | 100 | 5,000 |

Over the budget you get a `429` with `Retry-After`. Since the budget is per game, not per player, this is the one a very popular game could reach at peak. If you're getting close, get in touch through the dashboard.

## Other calls

| Call | Limit | Scope |
|---|---|---|
| `POST /achievements` | 120 calls per hour, up to 100 IDs per call | Per player per game |
| `POST /play-sessions/start` and `/end` (signed-in) | 240 calls per hour | Per signed-in session |
| `POST /auth/google`, `POST /auth/apple` | 30 per hour per IP, and 20 per hour per Google/Apple account | Per IP and per account |
| `POST /auth/device/code` | 30 codes per hour | Per client IP |
| `GET /auth/device/status/:code` | 60 per minute | Per client IP |
| `POST /auth/device/approve` | 30 per hour per IP, and 20 per hour per Google/Apple account | Per IP and per account |
| Board reads | Up to 1,000 entries per request, edge-cached for about 30 s | Per request |
| Request body | 64 KB | Per request |

Batch achievements: one call with `achievementIds` instead of one call per unlock. The SDKs do this for you.

## Not rate limits, but similar

- **`503` "Score submissions for this game are temporarily paused"**: the game's submits are paused during an incident. `Retry-After` is 300 seconds.
- **`503` "Too many pending device authorizations"**: too many unapproved device codes are outstanding platform-wide. Wait a moment and request a new code.
- **"Too many active sessions"** on a play-session start: the player already has 3 play sessions open. End sessions when runs finish (`POST /play-sessions/end`).

## Handling a 429

- **Respect `Retry-After`.** Wait at least that long before the next request of that kind.
- **Never retry in a tight loop.** A loop that retries immediately on failure turns one rejected request into thousands, and keeps the limit tripped.
- **Submit once per game over**, not per kill, per tap or per frame. For live in-run progress, keep it local and submit at the end; for presence or heartbeat-style data, use a [targeted board](/concepts/category-boards) at a modest interval.
- **Don't treat a 429 as a sign-out.** Only `401`/`403` mean the session is dead.

Self-hosting? Every limit here is an environment variable on the proxy, with these values as defaults. See the [proxy README](https://github.com/cheddatech/cheddaboards-proxy#environment-variables).
