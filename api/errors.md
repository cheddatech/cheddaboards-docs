# Errors

Every response is JSON. Success is `{"ok":true,"data":{...}}`; every error is:

```json
{"ok":false,"error":"<message>"}
```

Check `ok` before reading `data`, and surface `error` when it's false.

## Status codes at a glance

| Status | Meaning | What to do |
|--------|---------|------------|
| `200` | Success | Read `data` |
| `400` | Bad request: invalid input, validation failure, or the 2-second submit throttle | Read the error message; see below |
| `401` / `403` | Session token is dead (expired, logged out, or account removed), or the API key is missing, invalid or revoked | Session: discard the stored session and fall back to sign-in — see [Authentication](/api/authentication). API key: check the key in the Developer Console |
| `404` | Route or resource not found | For scoreboard lookups this is normal — the board just isn't configured |
| `409` | Device code already used | Request a new code |
| `410` | Device code expired | Request a new code and show the player the new link |
| `428` | Device-code auth still pending | Keep polling (every 5s) |
| `429` | Rate limit reached | Wait for the `Retry-After` header (seconds), then continue. See [Rate limits](/api/rate-limits) |
| `503` | Submits paused for this game, or too many pending device codes | Wait for `Retry-After` and try again |
| `5xx` | Transient upstream problem | Retry with backoff — [submits are safe to retry](/quickstart/rest#notes). Persistent? Check [status.cheddatech.com](https://status.cheddatech.com) |

## Common errors

### `Scoreboard '<id>' not found for this game.`

You submitted a score with a `scoreboardId` that doesn't exist on this game. Every game gets its standard time-based boards (all-time, weekly, daily) automatically — but **custom boards are never created by a submit**. Create the board first in the Developer Console (**Scoreboards** tab), and for targeted submits make sure its Board Type is **Targeted**. Retrying the same submit without creating the board will fail forever.

### `This game has time validation on. Start a play session first…`

The game has **time validation** enabled, which makes the play-session token required — a submit without a valid `playSessionToken` is rejected before any score checks run. Start a session when the run begins (`POST /play-sessions/start`), pass its token in the submit body, and end the session after submitting (`POST /play-sessions/end`). The SDKs attach the token for you but don't start sessions on their own — call `start_play_session()` / `StartPlaySession()` when the run begins. (The Godot template's game wrapper is the one place the whole lifecycle runs automatically.) If you're seeing this from an SDK integration, the session start didn't happen before the submit. See [Anti-cheat](/concepts/anti-cheat).

### Submitting to a fan-out board by ID

A `scoreboardId` on a submit means "this one targeted board only", so sending the ID of a **fan-out** board (`all-time`, `weekly`, `daily`, or a custom fan-out board) is rejected. To update those boards, **omit `scoreboardId`** — a plain submit already fans out to every one of them. See [Scores → targeted submits](/api/scores#targeted-submits).

### `rejected by game validation rules`

The score or streak went over one of the game's caps (maximum per round, or absolute maximum). The message is deliberately generic so players can't probe your limits: the specific cap and value are logged to your dashboard's suspicion log, visible only to the game owner. If you're the developer and this surprises you, check the Security tab's caps.

Time-validation and score-jump rejections are different: they come back with a specific reason such as `Played too quickly.` or `Score increase too large.`, listed in the [message reference](#message-reference) below, and are also written to the suspicion log.

### Nickname rejected

Nicknames must be **3–16 characters, letters, digits, and underscores only**. The nickname endpoints return a `400` with one of:

- `Nickname must be at least 3 characters`
- `Nickname must be 16 characters or less`
- `Nickname can only contain letters, numbers, and underscores`

A rejection is **permanent for that value** — don't retry the same nickname, ask the player for a different one.

A nickname that's merely **taken** is not an error: the backend appends a numeric suffix automatically (`PlayerName` → `PlayerName_1`), and the response tells you the name that was actually applied.

### `authorization_pending` (HTTP 428)

Not an error — the player just hasn't approved the device-code sign-in yet. Keep polling `/auth/device/token` every 5 seconds until you get `200` or the code expires.

### Rate limited

Two kinds. The **2-second throttle** (one submit per player per board every 2 seconds) comes back as a `400` telling you to wait; back-to-back submits to *different* boards are fine. Everything else, such as the hourly per-player submit cap, the per-IP cap and the API key budget, comes back as a **`429`** with a `Retry-After` header. Wait that long, never retry in a tight loop, and submit once per game over. All the limits are on [Rate limits](/api/rate-limits).

### Too many active play sessions

Play sessions are capped per player (enforced by the backend). End sessions when runs finish (`POST /play-sessions/end`); when testing, use a fresh `playerId` rather than accumulating sessions on one.

### `Too many pending device authorizations. Try again shortly.` (HTTP 503)

The device-code sign-in flow has a cap on outstanding unapproved codes. Transient — wait a moment and request a new code.

### OAuth / client ID errors

Games don't configure OAuth — there's nothing to register, and no client ID or bundle ID field in the Developer Console. Player sign-in goes through the device-code flow: request a code, show the player the link URL, and they sign in with Google or Apple on the CheddaBoards link page using CheddaBoards' own credentials. See [Authentication](/api/authentication).

If you're seeing an error that mentions client IDs or bundle IDs, you're calling a legacy direct-OAuth path that isn't supported for games. Switch to the device-code flow instead.

### `Unknown endpoint: <method> <path>`

The route doesn't exist — check the [endpoint reference](/quickstart/rest#endpoint-reference) for the exact path. The one people actually hit: there is **no standalone achievements read route** (`GET /players/{id}/achievements` doesn't exist). Achievements are only exposed on the profile — `GET /players/{playerId}/profile` returns them in `gameProfile.achievements`. SDK versions before 2.2.7 called the nonexistent route from `GetAchievements()` / `get_achievements()`; update the SDK or read achievements from the profile.

### Invalid path segment (HTTP 400)

Game and scoreboard IDs in URL paths must be 1–64 characters of letters, digits, `_` or `-`. Anything else is rejected before reaching the backend. Usually this means a bug in how you build the URL — an unescaped string, an uninitialized buffer, or a stray null byte.

## Message reference

Every error message the hosted API can return to a game, grouped by status. Values in angle brackets (`<id>`) are filled in with yours. Messages from Developer Console routes aren't listed.

### 400 Bad request

**Request shape**

| Message | Meaning |
|---|---|
| `Invalid JSON body` | The request body isn't valid JSON. |
| `Missing X-Game-ID header` / `Missing game ID. Include X-Game-ID header or gameId in body.` | No game ID on the request. |
| `Missing required field: <field>` | A required body field is absent, for example `playerId`, `playSessionToken`, `device_code` or `user_code`. |
| `playerId must be a string between 1-100 characters` | The API-key routes accept 1–100 characters. Starting a play session with a `playerId` needs 3–100. |
| `score must be a non-negative number` | `score` is missing, negative, or not a number. |
| `scoreboardId, if provided, must be a non-empty string` | Leave `scoreboardId` out entirely rather than sending an empty string. |
| `Invalid game ID in path…` / `Invalid scoreboard ID in path…` / `Invalid board ID` | See [invalid path segment](#invalid-path-segment-http-400). |
| `Invalid board or player ID` | A rank lookup was given an ID it can't use. |
| `Invalid game ID "<id>"…` / `Unknown game ID "<id>"…` | Requesting a device code with a malformed game ID, or one that isn't registered. Copy the Game ID from the Developer Console. |

**Score submits**

| Message | Meaning |
|---|---|
| `Please wait 2 seconds between submissions.` | Same player, same board, within 2 seconds. See [Rate limits](/api/rate-limits). |
| `Scoreboard '<id>' not found for this game.` | See [above](#scoreboard-id-not-found-for-this-game). |
| `'<id>' is a fan-out board - submit without a scoreboardId…` | See [submitting to a fan-out board](#submitting-to-a-fan-out-board-by-id). |
| `Score rejected by game validation rules` / `Streak rejected by game validation rules` | Over one of the game's caps. See [above](#rejected-by-game-validation-rules). |
| `Score increase too large.` / `Streak increase too large.` | The new value jumped further past the player's previous one than the game's maximum-increase setting allows. |
| `Game is not active` | The game has been deactivated or deleted. |
| `Scoreboard is not active` / `Scoreboard does not belong to this game.` | The target board is switched off, or its ID belongs to a different game. |
| `This game only accepts API submissions` / `This game only accepts web SDK submissions` | The submit came in a way the game's access mode doesn't allow. Check the setting in the Developer Console. |

**Time validation (play sessions)**

Only games with time validation turned on return these. None of them mean the player's sign-in is bad: start a new play session and carry on. See [Anti-cheat](/concepts/anti-cheat).

| Message | Meaning |
|---|---|
| `This game has time validation on. Start a play session first…` | The submit had no `playSessionToken`. See [above](#this-game-has-time-validation-on-start-a-play-session-first). |
| `Invalid or expired play session. Start a new game.` | The token isn't recognised, usually because it was already cleaned up. |
| `Session expired. Start a new game.` | The play session ran past its time limit before the score was sent. |
| `Session already used. Start a new game.` | Each play session counts for one run. Start a fresh one for the next run. |
| `Session belongs to another player.` / `Session is for a different game.` | The token was started for a different player or game. |
| `Played too quickly.` | The run was shorter than the game's minimum play time. |
| `Score too high for play duration.` | The score is higher than the game allows for how long the run lasted. |
| `Play session validation failed.` | Generic fallback for a play-session check that failed without a specific reason. |
| `Too many active sessions. Finish or wait for current sessions to expire.` | See [too many active play sessions](#too-many-active-play-sessions). |

**Players and achievements**

| Message | Meaning |
|---|---|
| `Nickname must be at least 3 characters` / `…16 characters or less` / `…letters, numbers, and underscores` | See [nickname rejected](#nickname-rejected). |
| `No profile for this game. Play first!` | Unlocking an achievement for a player who has no profile on this game yet. Submit a score (or start a session) first. |

### 401 Unauthorized

| Message | Meaning |
|---|---|
| `Missing session token` / `API key or session token required` | The request needs a session token or an API key and had neither. |
| `Invalid session` / `Invalid session: not found` / `Session expired` / `Session invalid` | The stored sign-in is dead. See [session expiry](#session-expiry). |
| `Missing API key` / `Invalid API key` / `API key has been revoked` | Check the key in the Developer Console, or generate a new one. |
| `Session required to get player rank` | Rank lookups need a session or an API key. |

### 404 Not found

| Message | Meaning |
|---|---|
| `Game not found` | The game ID isn't registered. |
| `Scoreboard not found` | The board isn't configured on this game. On lookups this is normal. |
| `Player not found` | No player with that ID on this game yet. Normal for a brand-new player before their first submit. |
| `Session not found` | The play session doesn't exist (status lookups and `/play-sessions/end`). |
| `Archive not found` | No archived period with that ID. |
| `Invalid or expired device code` / `Invalid or expired user code…` | The code was never issued, or it has already been cleaned up. Request a new one. |
| `Unknown endpoint: <method> <path>` | See [above](#unknown-endpoint-method-path). |

### 409, 410 and 428 (device-code sign-in)

| Status | Message | Meaning |
|---|---|---|
| `428` | `authorization_pending` | The player hasn't approved yet. Keep polling every 5 seconds. |
| `410` | `expired_token` | The device code expired before approval. Request a new code. |
| `410` | `Code expired. The game will need to request a new code.` | Shown on the link page when the player enters an expired code. |
| `409` | `This code has already been used.` | The player entered a code that was already approved. |

On `428` and `410` from `/auth/device/token`, `error` holds the short code above and a readable message is in `error_description`.

### 429 Too many requests

All come with a `Retry-After` header in seconds. Limits are on [Rate limits](/api/rate-limits).

| Message | Meaning |
|---|---|
| `Too many score submissions for this player. Submit once per game over.` | The player's hourly submit cap. |
| `Too many score submissions from this address` | Per-IP cap, across all games. |
| `Rate limit exceeded (per minute)` / `Rate limit exceeded (per hour)` | The game's API key budget. |
| `Too many requests. Please try again later.` | A per-route limit, for example on sign-in or device codes. |

### 5xx Server errors

| Status | Message | Meaning |
|---|---|---|
| `503` | `Backend temporarily unavailable` | The API couldn't reach the leaderboards on-chain. Retry with backoff. |
| `503` | `Score submissions for this game are temporarily paused` | Submits for this game have been paused, usually because of runaway traffic. `Retry-After` is 300 seconds. |
| `503` | `Too many pending device authorizations. Try again shortly.` | See [above](#too-many-pending-device-authorizations-try-again-shortly-http-503). |
| `500` | `Failed to <action>` (for example `Failed to submit score`) or `Internal server error` | A transient failure on the way to the backend. Submits are [safe to retry](/quickstart/rest#notes). |

## Session expiry

Sessions last 30 days and renew on use, so active players stay signed in indefinitely. Any `401`/`403` on a session-authenticated request means the session is dead: clear the stored token, fall back to your sign-in flow, and don't retry the request with the same token. The official SDKs treat this as an automatic sign-out.

## When it's not you

First stop: **[status.cheddatech.com](https://status.cheddatech.com)**. It checks the API, the on-chain leaderboards, the website and these docs every few minutes from outside CheddaBoards' own infrastructure, and any outage shows there with its history.

Occasionally the chain itself has a transient wobble (a subnet replica upgrade, for example) and you'll see a `5xx` for a few seconds. Submits are [safe to retry](/quickstart/rest#notes), so a single retry with a short backoff covers it. If the API is unreachable entirely, board *reads* still work [directly from the canister](/quickstart/rest#reading-boards-straight-from-the-chain).

**See also:** [REST quick start](/quickstart/rest) · [Authentication](/api/authentication) · [Anti-cheat](/concepts/anti-cheat) · [Service status](https://status.cheddatech.com)