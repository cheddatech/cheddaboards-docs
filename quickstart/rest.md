# REST quick start

Use CheddaBoards from **any** engine or language by calling the HTTP API directly — no Godot, no SDK. This is the same API the Godot SDK uses under the hood.

::: tip Working in C or C++?
There's a community-built C library wrapping this API — [charlie-makes-things/C_cheddaboards](https://github.com/charlie-makes-things/C_cheddaboards) — with static and dynamic builds (Linux / Mac / MinGW-linkable Windows, via libcurl) covering score submission (global and targeted) and user handling. It hands you raw JSON responses to parse yourself, so this page still applies.
:::

::: info
Endpoints and request bodies on this page are verified against the live API (September 2026). Response field names are described where confirmed; check live responses for the exact shape of any field your code depends on.
:::

## Before you start

Register a game in the [dashboard](https://cheddaboards.com/developers) and grab its **Game ID** and **API key** from the Developer Console. That's the only setup — everything below works with those two values.

## Base URL

```
https://api.cheddaboards.com
```

The API is browser-safe: CORS is enabled, so HTML5 games — including builds iframed on itch.io or CrazyGames — can call it directly with `fetch`. No server of your own required.

## Authentication

Every request sends JSON and identifies the game. How you identify the *player* depends on whether they're anonymous or signed in.

| Header | Value | When |
|--------|-------|------|
| `Content-Type` | `application/json` | Always |
| `X-Game-ID` | your Game ID (e.g. `my-game`) | Always |
| `X-API-Key` | your API key (`cb_my-game_xxxxxxxxx`) | Anonymous / API-key requests |
| `X-Session-Token` | the player's `sessionId` | After Device Code sign-in |

`X-Session-Token` and `X-API-Key` are mutually exclusive — if you have a session token, send that instead of the API key. (Exception: `play-sessions/*` always use the API key.)

### Players & anonymous identity

There's no "anonymous login" call. An anonymous player is just a **persistent ID you generate and store client-side** — the SDK uses the form `dev_<unixtime>_<random>` (e.g. `dev_1730000000_1a2b3c4d`). Send it as `playerId`; the first score submission creates the profile on the backend.

### Nicknames

One rule everywhere: **3–16 characters, letters, digits, and underscores only** (`A–Z a–z 0–9 _`). This applies to nicknames on submits, both nickname-change endpoints, and sign-in names. An invalid nickname is rejected with a clear `400` — rejection is permanent for that value, so don't retry the same nickname on `nickname_error`; ask the player for another. A nickname that's merely *taken* is handled for you: the backend appends a numeric suffix (`PlayerName` → `PlayerName_1`) and tells you the name it applied.

## 1. Submit a score

```bash
curl -X POST https://api.cheddaboards.com/scores \
  -H "Content-Type: application/json" \
  -H "X-API-Key: cb_my-game_xxxxxxxxx" \
  -H "X-Game-ID: my-game" \
  -d '{
    "playerId": "dev_1730000000_1a2b3c4d",
    "gameId": "my-game",
    "score": 1000,
    "streak": 5,
    "nickname": "PlayerName"
  }'
```

A successful submit returns:

```json
{"ok":true,"data":{"message":"🎉 New high score and streak! Score: 1234, Streak: 3"}}
```

Check `ok` for success — `message` is human-readable feedback for the player, not a structured field. To read the player's stored bests afterwards, `GET /players/{playerId}/profile` returns:

```json
{"ok":true,"data":{"nickname":"PlayerName","created":1788570532131407400,"gameProfile":{"score":1234,"streak":3,"achievements":[],"playCount":2,"lastPlayed":1788571122315540500}}}
```

(Timestamps are nanoseconds since epoch — divide by 1,000,000 for JavaScript milliseconds.)

A submit with no `scoreboardId` (above) **fans out**: the score is recorded against the player's profile and applied to every one of the game's standard time-based boards (all-time, weekly, daily, etc.).

If you started a play session for the run (see §4 — recommended), include its token in the body as `"playSessionToken": "<token>"` so the backend can time-validate the score. If the game has time validation enabled, the session token is **required**, not optional.

### Submitting to one specific board (category / targeted scoreboards)

Targeted scoreboards let you run per-level or per-category leaderboards — `level-01 … level-28`, `boss-rush`, `time-trial`, `runs`, and so on — under a single game, without registering a separate game for each.

There are two kinds of board:

- **Fan-out boards** (the default) receive *every* plain submit, as in §1.
- **Targeted boards** receive *only* scores explicitly addressed to them by ID. A plain submit never touches them.

To send a score to one targeted board, add `scoreboardId` to the body:

```bash
curl -X POST https://api.cheddaboards.com/scores \
  -H "Content-Type: application/json" \
  -H "X-API-Key: cb_my-game_xxxxxxxxx" \
  -H "X-Game-ID: my-game" \
  -d '{
    "playerId": "dev_1730000000_1a2b3c4d",
    "gameId": "my-game",
    "score": 1000,
    "streak": 5,
    "nickname": "PlayerName",
    "scoreboardId": "level-14"
  }'
```

On success the response confirms the board it landed on, e.g. `"Submitted to level-14 - Score: 1000, Streak: 0"`.

How a targeted submit differs from a plain one:

- It writes to **exactly that one board** and nowhere else — no fan-out to your time-based boards.
- It counts toward the player's play count for the game, but score/streak totals on the aggregate profile only move on plain submits. If you also want the score reflected in the player's overall bests, send a separate plain submit.
- The same play-session / time-validation and rate-limit rules apply as for a plain submit.
- You can chain several targeted submits for one run (e.g. a `runs` board plus the relevant `level-14` board) — the throttle is keyed per board, so back-to-back board writes won't trip the 2-second gate.

The target board must already exist **and be marked as targeted**. Create it in the **Developer Console → Scoreboards** tab: set a Scoreboard ID, choose **Board Type → Targeted**, and create it. Submitting a `scoreboardId` that points at a board that doesn't exist returns `"Scoreboard '<id>' not found for this game."` — create the board in the console first; a submit never creates a board.

Reading a targeted board is no different from any other — see §2 below and the scoreboard read endpoint:

```bash
curl "https://api.cheddaboards.com/games/my-game/scoreboards/level-14?limit=100" \
  -H "X-API-Key: cb_my-game_xxxxxxxxx" \
  -H "X-Game-ID: my-game"
```

## 2. Read the leaderboard

```bash
curl "https://api.cheddaboards.com/leaderboard?sort=score&limit=100" \
  -H "X-API-Key: cb_my-game_xxxxxxxxx" \
  -H "X-Game-ID: my-game"
```

`sort` accepts `score` or `streak`. The response:

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

`authType` tells you how the player is signed in (`external` for anonymous / API-key players, distinct values for linked accounts) — useful if you want to badge verified players in your UI.

This reads the game's global (fan-out) leaderboard. For a specific board — timed *or* targeted — use `GET /games/{gameId}/scoreboards/{scoreboardId}`.

Scoreboard reads are edge-cached for around 30 seconds, so there's no benefit to polling a board faster than that. If you refresh a board on screen, a 30-second interval plus a refresh after your own submit is the pattern the official SDKs use.

### Reading boards straight from the chain

Scoreboard reads are also served directly by the CheddaBoards canister on the Internet Computer — no proxy in the path at all:

```bash
curl "https://fdvph-sqaaa-aaaap-qqc4a-cai.raw.icp0.io/games/my-game/scoreboards/level-14?limit=100"
```

Same paths, same JSON — responses are identical to the API responses above. No API key needed; board data is public. The official Godot SDK reads boards this way by default. It's browser-safe too: the endpoint serves `Access-Control-Allow-Origin: *`, so HTML5 games and web pages can fetch it directly.

Why you might prefer it:

- **Independence.** The read works as long as the canister exists, regardless of what happens to the API layer in front of it.
- **It's the durable option** for kiosks, overlays, and companion pages that only ever *read* scores.

Writes (score submits, sessions, auth) always go through `api.cheddaboards.com` — the canister only accepts writes from the verified API layer, which is what keeps score submission gated and validated.

## 3. Sign in with Google / Apple (Device Code)

A two-step polling flow (RFC 8628). The player authorises on their phone; you poll until approved.

**Request a code:**

```bash
curl -X POST https://api.cheddaboards.com/auth/device/code \
  -H "Content-Type: application/json" \
  -H "X-Game-ID: my-game" \
  -d '{"gameId": "my-game"}'
```

Returns a user code, a verification URL (`cheddaboards.com/link`), the `device_code`, and a QR data URL. Show the user code + QR to the player.

If the player has already entered a nickname in your game, pass it along in the body as `"nickname"`: when the sign-in creates a brand-new account, that name seeds the account's nickname (subject to the 3–16 rule above). Existing accounts keep their name — a sign-in never renames anyone.

**Poll for approval:**

```bash
curl -X POST https://api.cheddaboards.com/auth/device/token \
  -H "Content-Type: application/json" \
  -H "X-Game-ID: my-game" \
  -d '{"device_code": "<device_code>"}'
```

- **`428`** → `authorization_pending`, keep polling (the SDK polls every 5s).
- **`200`** with `{ "ok": true, "data": { "sessionId": "...", "nickname": "...", "email": "...", "gameProfile": {...} } }` → approved.

Use the returned `sessionId` as your `X-Session-Token` on subsequent requests, and stop sending `X-API-Key`.

**Persist the session.** Store the `sessionId` client-side so the player stays signed in across launches instead of repeating device code auth every visit (the Godot SDK does this automatically). Sessions are long-lived — 30 days, renewed on use, so an active player effectively stays signed in. A `401`/`403` on a session-authenticated request means the session is dead (expired, logged out elsewhere, or the account was removed): discard the stored token and fall back to the sign-in flow.

## 4. Anti-cheat play sessions (recommended)

Wrap each run in a server-tracked session so the backend can validate the score against elapsed time. The Godot SDK does this automatically; on the raw REST path you do it yourself. **If you've set anti-cheat caps on your dashboard — or enabled time validation for the game — do this**: scores submitted without a valid session token skip time validation and may be rejected. Targeted submits go through the same gate.

The lifecycle is: **start** when the run begins → **pass the token** in your `POST /scores` body → **end** after submitting.

```bash
# Start
curl -X POST https://api.cheddaboards.com/play-sessions/start \
  -H "Content-Type: application/json" \
  -H "X-API-Key: cb_my-game_xxxxxxxxx" \
  -H "X-Game-ID: my-game" \
  -d '{"gameId": "my-game", "playerId": "dev_1730000000_1a2b3c4d"}'

# End
curl -X POST https://api.cheddaboards.com/play-sessions/end \
  -H "Content-Type: application/json" \
  -H "X-API-Key: cb_my-game_xxxxxxxxx" \
  -H "X-Game-ID: my-game" \
  -d '{"playSessionToken": "<token>"}'
```

The start call returns the session token in `data.ok`:

```json
{"ok":true,"data":{"ok":"<playSessionToken>","message":"Play session started"}}
```

Note that when a game has time validation **off**, session tokens are accepted but not checked — submits succeed with or without one. Wire up the session lifecycle anyway: it costs nothing, and the moment you enable time validation on the dashboard your scores are already protected instead of suddenly rejected.

Pass the same `playSessionToken` in your `POST /scores` body (plain *or* targeted), and configure limits from your dashboard's Security tab — see [Anti-cheat](/concepts/anti-cheat). Sessions are capped per player, so end them when the run finishes (or use a fresh `playerId` when testing) to avoid a "too many active sessions" error.

A rejected score comes back as a generic validation error (e.g. `"rejected by game validation rules"`) — the specific reason is logged to your dashboard's suspicion log, not exposed to the client, so cheaters can't probe your limits.

## The whole loop in JavaScript

For web and HTML5 games, here's the full cycle — persistent player ID, session, validated submit, board read — in one place:

```js
const API = 'https://api.cheddaboards.com';
const GAME_ID = 'my-game';
const API_KEY = 'cb_my-game_xxxxxxxxx';

const headers = {
  'Content-Type': 'application/json',
  'X-Game-ID': GAME_ID,
  'X-API-Key': API_KEY,
};

// Persistent anonymous player ID
let playerId = localStorage.getItem('cb_player_id');
if (!playerId) {
  playerId = `dev_${Math.floor(Date.now() / 1000)}_${Math.random().toString(16).slice(2, 10)}`;
  localStorage.setItem('cb_player_id', playerId);
}

async function post(path, body) {
  const res = await fetch(API + path, { method: 'POST', headers, body: JSON.stringify(body) });
  return res.json();
}

// 1. Run starts → open a play session
const start = await post('/play-sessions/start', { gameId: GAME_ID, playerId });
const playSessionToken = start.data.ok;

// ... the player plays ...

// 2. Run ends → submit the score with the session token
const submit = await post('/scores', {
  playerId,
  gameId: GAME_ID,
  score: 1234,
  streak: 3,
  nickname: 'PlayerName',
  playSessionToken,
});
if (!submit.ok) console.warn('Score rejected:', submit);

// 3. Close the session
await post('/play-sessions/end', { playSessionToken });

// 4. Show the board
const res = await fetch(`${API}/leaderboard?sort=score&limit=10`, { headers });
const board = await res.json();
for (const entry of board.data.leaderboard) {
  console.log(`#${entry.rank} ${entry.nickname} — ${entry.score}`);
}
```

That's a complete integration. Everything else on this page — targeted boards, sign-in, nickname changes — is optional on top.

## Endpoint reference

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/scores` | Submit a score (`playerId`, `gameId`, `score`, `streak`, `nickname`, `playSessionToken?`, `scoreboardId?`). With `scoreboardId`, writes to that one targeted board instead of fanning out. |
| `GET`  | `/leaderboard?sort={score\|streak}&limit={n}` | Global leaderboard |
| `GET`  | `/games/{gameId}/scoreboards/{scoreboardId}/rank` | A player's rank on a board (session-authenticated) |
| `GET`  | `/players/{playerId}/profile` | Anonymous player profile |
| `GET`  | `/auth/profile` | Signed-in player profile (uses `X-Session-Token`) |
| `PUT`  | `/profile/nickname` | Change nickname, signed-in (`X-Session-Token`, `{ nickname }`) |
| `PUT`  | `/players/{playerId}/nickname` | Change nickname, anonymous (`{ nickname }`) |
| `GET`  | `/games/{gameId}/scoreboards` | List the game's scoreboards (timed and targeted) |
| `GET`  | `/games/{gameId}/scoreboards/{scoreboardId}?limit={n}` | A single scoreboard's entries (timed or targeted) |
| `POST` | `/auth/device/code` | Start Device Code auth (`{ gameId, nickname? }`) |
| `POST` | `/auth/device/token` | Poll for approval (`{ device_code }`) |
| `POST` | `/migrate-account` | Upgrade an anonymous account to a verified one |
| `POST` | `/play-sessions/start` | Begin an anti-cheat session (`{ gameId, playerId }`) |
| `POST` | `/play-sessions/end` | End a session (`{ playSessionToken }`) |
| `POST` | `/achievements` | Unlock achievements — single (`{ achievementId }`) or batch (`{ achievementIds: [...] }`); read them back via the player's profile |
| `GET`  | `/game` | Game metadata |
| `GET`  | `/stats` | Platform submission stats |
| `GET`  | `/health` | Service health check |

::: info
Timed-scoreboard **archives** have their own endpoints under `/games/{gameId}/scoreboards/...` — see [Timed leaderboards](/concepts/timed-leaderboards).
:::

## Notes

- All bodies are JSON; all responses are JSON.
- Game and scoreboard IDs in URL paths must be 1–64 characters of letters, digits, `_` or `-`; anything else returns a `400` before reaching the backend.
- A `404` on a scoreboard lookup is normal — it just means that scoreboard isn't configured for the game.
- **Submits are safe to retry.** The backend keeps per-player bests, so resending a score after a timeout can never lower a score or streak — no client-side dedupe needed. The only thing a duplicate submit moves is the player's play count, so avoid blind retry *loops* if play counts matter to you.
- Rate limiting is enforced server-side: one submit per player per board every 2 seconds.
- Targeted boards are created in the Developer Console (**Board Type → Targeted**) before you submit to them. A submit never creates one — but every game's standard timed boards (all-time, weekly, daily) exist from registration.

**See also:** [Godot drop-in quick start](/quickstart/godot) · [Authentication](/api/authentication) · [Anti-cheat](/concepts/anti-cheat) · [Community C library](https://github.com/charlie-makes-things/C_cheddaboards)