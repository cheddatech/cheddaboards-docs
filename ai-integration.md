---
title: CheddaBoards for AI coding assistants
description: The whole CheddaBoards API as a flat spec for models and agents — endpoints, headers, bodies, exact error strings, and the rules an integration must follow.
---

# CheddaBoards for AI coding assistants

This page is written for a model that has been asked to add CheddaBoards to a game. It contains no narrative, only facts and rules. If you are a human, the [REST quick start](/quickstart/rest) is friendlier; everything here is also true.

Verified against live API v1.8.0, October 2026.

## 1. What CheddaBoards is

- Hosted leaderboards, achievements, and optional player accounts for any game engine.
- One HTTP/JSON API. The official Godot and Unity SDKs are thin wrappers over it. Any language with an HTTP client works.
- Free hosted service. No credit card, no per-player fees. 3 games per developer account by default, more on request from the dashboard.
- Backend is an open-source canister on the Internet Computer. Board reads can be served straight from the canister with no API layer in the path.

## 2. Setup the developer does once

1. Sign in at https://cheddaboards.com/developers (Google, Apple, or Internet Identity).
2. Register a game. Game IDs are 3–50 characters, lowercase letters, digits and hyphens.
3. Copy the **Game ID** and the **API key**. API keys look like `cb_<game-id>_<digits>`. The game ID is embedded in the key.

The API key ships inside the game binary. Treat it as identifying, not secret: it cannot read private data or modify the game, and all score validation runs server-side.

## 3. Base URL, headers, response shape

Base URL: `https://api.cheddaboards.com`

| Header | Value | When |
|---|---|---|
| `Content-Type` | `application/json` | Every request with a body |
| `X-Game-ID` | the game ID | Always |
| `X-API-Key` | the API key | Anonymous / API-key requests |
| `X-Session-Token` | the player's `sessionId` | After device-code sign-in. Send **instead of** `X-API-Key`. |

Exception: `POST /play-sessions/start` and `/end` always use `X-API-Key`.

Every response is JSON:

```json
{"ok":true,"data":{...}}
{"ok":false,"error":"<message>"}
```

Always branch on `ok`. Never parse `data.message` on a submit; it is human-readable feedback for the player and varies.

Timestamps are **nanoseconds** since the Unix epoch. Divide by 1,000,000 for JavaScript milliseconds.

CORS is open. Browser games, including builds iframed on itch.io, call the API directly with `fetch`.

## 4. Players

There is no anonymous login endpoint. An anonymous player is a persistent ID the client generates once and stores locally:

```
dev_<unix-seconds>_<8 hex chars>
```

Send it as `playerId`. The first `POST /scores` creates the profile. If no `nickname` is supplied the server assigns one like `Player_1248`.

Nickname rule everywhere: **3–16 characters, `A–Z a–z 0–9 _` only**. A taken name is auto-suffixed (`Chedz` → `Chedz_1`) and the response reports the name actually applied. An invalid name returns 400 and the rejection is permanent for that value; do not retry it.

`nickname` on `POST /scores` is optional and **presence is meaning**: including it renames the player. Only include it on the submit immediately after the player chose a name (typically their first submit). Otherwise omit the field.

## 5. Endpoints

| Method | Path | Auth | Body / query |
|---|---|---|---|
| `POST` | `/scores` | API key or session | `{playerId, gameId, score, streak, nickname?, playSessionToken?, scoreboardId?}` |
| `GET` | `/leaderboard?sort=score\|streak&limit=N` | API key or session | Global fan-out board. `limit` up to 1000. |
| `GET` | `/games/{gameId}/scoreboards` | API key | List the game's boards |
| `GET` | `/games/{gameId}/scoreboards/{boardId}?limit=N` | API key | One board's entries |
| `GET` | `/games/{gameId}/scoreboards/{boardId}/rank` | session | Signed-in player's rank on that board |
| `GET` | `/players/{playerId}/profile` | API key | Anonymous player profile, includes `gameProfile.achievements` |
| `GET` | `/players/{playerId}/rank?sort=score` | API key | Anonymous player's rank on the global board |
| `PUT` | `/players/{playerId}/nickname` | API key | `{nickname}` |
| `GET` | `/auth/profile` | session | Signed-in player profile |
| `PUT` | `/profile/nickname` | session | `{nickname}` |
| `POST` | `/auth/device/code` | none (`X-Game-ID` only) | `{gameId, nickname?}` |
| `POST` | `/auth/device/token` | none (`X-Game-ID` only) | `{device_code}` |
| `POST` | `/play-sessions/start` | API key | `{gameId, playerId}` |
| `POST` | `/play-sessions/end` | API key | `{playSessionToken}` |
| `POST` | `/achievements` | API key or session | `{playerId, gameId, achievementId}` or `{playerId, gameId, achievementIds:[...]}` (max 100) |
| `GET` | `/game` | API key | Game metadata, including `timeValidationEnabled` and the board list |
| `GET` | `/health` | none | Service health |

There is **no** `GET /players/{id}/achievements`. Read achievements from the profile.

Game and board IDs in URL paths must match `[A-Za-z0-9_-]{1,64}` or the request is rejected with 400 before reaching the backend.

### 5a. Direct canister reads (optional, keyless)

Every `GET .../scoreboards/...` path is also served by the canister itself with identical JSON and `Access-Control-Allow-Origin: *`:

```
https://fdvph-sqaaa-aaaap-qqc4a-cai.raw.icp0.io/games/{gameId}/scoreboards/{boardId}?limit=N
```

No headers required. Use this for read-only surfaces (overlays, kiosks, companion pages) or as a fallback if the API is unreachable. Writes always go through `api.cheddaboards.com`.

## 6. Boards

Every game is created with three **fan-out** boards: `all-time`, `weekly`, `daily`. Note the hyphen in `all-time`. Weekly and daily reset on UTC calendar boundaries and archive the previous period.

- A `POST /scores` **without** `scoreboardId` fans out: profile bests updated, every fan-out board updated. This is the normal "run ended" submit.
- A `POST /scores` **with** `scoreboardId` writes to that one **targeted** board only, and increments the play count but not the profile's aggregate bests. Use for per-level, per-mode, per-category boards.
- Targeted boards must be created in the dashboard first (Scoreboards → Board Type: Targeted). A submit never creates a board.
- Never put a fan-out board's ID (`all-time`, `weekly`, `daily`) in `scoreboardId`. It is rejected. Omit the field instead.
- Only a player's best survives on each board. Score and streak are independent maxima. Submitting a lower score never lowers anything.

## 7. Play sessions and time validation

Each game has a dashboard switch, **time validation**. When it is on, `POST /scores` **requires** a valid `playSessionToken`; without one the submit is rejected before any score check runs. When it is off, the token is accepted and ignored.

Always implement the lifecycle so the game keeps working if the developer turns validation on later:

1. Run starts → `POST /play-sessions/start` with `{gameId, playerId}`. The token is returned as `data.ok`:
   ```json
   {"ok":true,"data":{"ok":"<playSessionToken>","message":"Play session started"}}
   ```
2. Run ends → `POST /scores` with `playSessionToken` in the body.
3. After the submit → `POST /play-sessions/end` with `{playSessionToken}`.

Sessions are capped per player. End them. When testing, use a fresh `playerId` rather than accumulating sessions on one.

Check `GET /game` → `data.timeValidationEnabled` if you need to know the game's current setting.

## 8. Sign-in (device code, optional)

Players never see an OAuth screen in the game and the game never holds OAuth credentials.

1. `POST /auth/device/code` with `{gameId, nickname?}`. Response includes `user_code`, `verification_url` (`https://cheddaboards.com/link`), `device_code`, `expires_in` (300 s) and a QR image as a `data:image/png;base64,...` URL.
2. Show the player the code, the URL and/or the QR. They sign in with Google or Apple on their phone or in a browser.
3. Poll `POST /auth/device/token` with `{device_code}` every 5 seconds. `428` with `authorization_pending` means keep polling. `200` returns `{sessionId, nickname, email, gameProfile}`.
4. Store `sessionId` on the device. From now on send `X-Session-Token: <sessionId>` and stop sending `X-API-Key` (except on `/play-sessions/*`).

If the player had anonymous progress under a `dev_` ID, the backend merges it into the account after approval (per-field maximum for score and streak, achievements unioned, play counts summed). The anonymous ID is retired.

Sessions last 30 days and renew on use. Any `401` or `403` on a session request means the session is dead: delete the stored `sessionId`, fall back to anonymous or re-run sign-in, do not retry with the same token.

## 9. Achievements

`POST /achievements` with one `achievementId` or up to 100 `achievementIds`. Achievement IDs are strings the game defines; nothing is pre-registered. Unlocks are idempotent. Anonymous players' achievements are stored server-side and carry over when they link an account. Read back via `GET /players/{playerId}/profile` → `data.gameProfile.achievements`.

## 10. Rate limits and retries

- One score submit per player **per board** every 2 seconds. Always on, not configurable. Back-to-back submits to different boards are fine.
- Submits are safe to retry after a timeout: bests only ever go up, and repeat submits within a few seconds count as one play.
- Board reads are edge-cached for ~30 seconds. Do not poll faster than that; refresh after the player's own submit instead.

## 11. Error strings you should match on

All errors arrive as `{"ok":false,"error":"..."}`. Status codes: 400 input/validation/rate-limit, 401/403 dead session, 404 route or board not found, 428 device code pending, 5xx transient (retry with backoff).

| Error (substring is enough) | Cause | Correct handling |
|---|---|---|
| `Scoreboard '<id>' not found for this game.` | `scoreboardId` names a board that doesn't exist | Create the board in the dashboard. Never retry blindly. |
| `requires starting a session` or mentions `time validation` / `play session` | Time validation is on and no valid `playSessionToken` was sent | Start a play session before the run and pass its token |
| `rejected by game validation rules` | Score or streak cap, or time check, failed | Deliberately generic. The reason is in the developer's suspicion log. Do not surface detail to the player. |
| `Nickname must be at least 3 characters` / `Nickname must be 16 characters or less` / `Nickname can only contain letters, numbers, and underscores` | Invalid nickname | Ask for a different name. Do not retry the same value. |
| `authorization_pending` (HTTP 428) | Device code not yet approved | Keep polling every 5 s until 200 or expiry |
| `Too many pending device authorizations. Try again shortly.` (503) | Transient cap | Wait, request a new code |
| rate-limit message (400) | Submitted to the same board within 2 s | Wait and resend, or stop over-submitting |
| too many active play sessions | Sessions not ended | Call `/play-sessions/end`; use a fresh `playerId` when testing |
| `Unknown endpoint: <method> <path>` | Wrong path | Check section 5. Usually the nonexistent achievements GET route. |
| 401 / 403 on a session request | Session expired, logged out, or account removed | Discard the token, fall back to sign-in |

## 12. Minimal correct integration (any language)

```
on game start:
    playerId = load("cb_player_id") or generate "dev_<unix>_<hex>" and save it
    sessionId = load("cb_session_id")   # may be absent

on run start:
    token = POST /play-sessions/start {gameId, playerId}    # X-API-Key always
    keep token

on run end:
    body = {playerId, gameId, score, streak, playSessionToken: token}
    if player just chose a name: body.nickname = name
    POST /scores body                                        # X-Session-Token if sessionId else X-API-Key
    POST /play-sessions/end {playSessionToken: token}
    GET /leaderboard?sort=score&limit=10                     # render data.leaderboard[].{rank,nickname,score,streak}

on any 401/403 with a session: delete sessionId, continue anonymously
```

## 13. SDK facts (if integrating via an SDK instead of REST)

**Godot 4 addon** (`addons/cheddaboards`, v2.3.0, Godot 4.3+). Install from the Godot Asset Store, enable under Project Settings → Plugins; this registers the `CheddaBoards` autoload. Credentials: `CheddaBoards.set_api_key("cb_...")` then `set_game_id("...")`, or run `addons/cheddaboards/SetupWizard.gd` with File → Run. Core calls: `login_anonymous()`, `start_play_session()`, `submit_score(score, streak)`, `get_leaderboard("score", 100)`, `change_nickname(name)`, `unlock_achievements_batch(ids)`, `login_with_device_code()`. Results arrive as signals (`login_success`, `score_submitted`, `score_error`, `leaderboard_loaded`, `nickname_changed`, `nickname_error`, `device_code_received`, `device_code_approved`, `account_upgraded`, `session_expired`). Rules: connect signals **before** calling the method that emits them; `login_anonymous()` emits `login_success` synchronously, so `await` after the call never resolves. `await CheddaBoards.wait_until_ready()` before the first call. Closing a device-code popup is a soft dismiss; only call `cancel_device_code()` on an explicit cancel. A drop-in sign-in popup ships at `addons/cheddaboards/ui/DeviceCodeLogin.tscn`. Direct canister board reads are the default. Worked example: https://github.com/cheddatech/cheddaboards-dodge-the-creeps (all integration in `Main.gd`).

**Godot 3.6 addon**: same API, GDScript 3 syntax (`yield`, `connect("signal", self, "method")`, `instance()`). https://github.com/cheddatech/cheddaboards-godot3-addon

**Unity**: copy `CheddaBoards.cs` into `Assets/Scripts`. Singleton `CheddaBoards.Instance`; `SetApiKey`, `SetGameId`, `LoginAnonymous(name)`, `StartPlaySession()`, `SubmitScore(score, streak)`, `GetAlltimeLeaderboard()`, events `OnLoginSuccess`, `OnScoreSubmitted`, `OnScoreboardLoaded`. Pure `UnityWebRequest`, no packages. https://github.com/cheddatech/CheddaBoards-Unity

## 14. Things not to do

- Do not send `nickname` on every submit.
- Do not send `all-time`, `weekly` or `daily` as `scoreboardId`.
- Do not create boards by submitting to them; they must exist first.
- Do not poll boards faster than every 30 seconds.
- Do not retry an invalid nickname or a 401/403 with the same token.
- Do not call `GET /players/{id}/achievements`; it does not exist.
- Do not register an OAuth client ID anywhere; there is nothing to register.
- Do not treat the API key as a secret that must be hidden from the binary; it can't be, and the design doesn't need it to be.

## 15. Links

- Human docs index: https://docs.cheddaboards.com
- Machine index: https://docs.cheddaboards.com/llms.txt and https://docs.cheddaboards.com/llms-full.txt
- Dashboard: https://cheddaboards.com/developers
- Status: https://status.cheddatech.com
- Privacy policy to reference from your own: https://cheddaboards.com/privacy.html
