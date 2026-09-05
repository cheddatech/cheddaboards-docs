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
| `400` | Bad request — invalid input, rate limit, or validation failure | Read the error message; see below |
| `401` / `403` | Session token is dead (expired, logged out, or account removed) | Discard the stored session and fall back to sign-in — see [Authentication](/api/authentication) |
| `404` | Route or resource not found | For scoreboard lookups this is normal — the board just isn't configured |
| `428` | Device-code auth still pending | Keep polling (every 5s) |
| `5xx` | Transient upstream problem | Retry with backoff — [submits are safe to retry](/quickstart/rest#notes) |

## Common errors

### `Scoreboard '<id>' not found for this game.`

You submitted a score with a `scoreboardId` that doesn't exist on this game. Every game gets its standard time-based boards (all-time, weekly, daily) automatically — but **custom boards are never created by a submit**. Create the board first in the Developer Console (**Scoreboards** tab), and for targeted submits make sure its Board Type is **Targeted**. Retrying the same submit without creating the board will fail forever.

### `rejected by game validation rules`

The score tripped one of the game's anti-cheat limits (score cap, streak cap, or time validation). The message is deliberately generic — the specific reason is logged to your dashboard's suspicion log, visible only to the game owner, so players can't probe your limits. If you're the developer and this surprises you, check the Security tab's caps and whether your submits carry a valid `playSessionToken`.

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

One submit per player per board every 2 seconds, enforced server-side — the error tells you to wait. Back-to-back submits to *different* boards are fine (the throttle is keyed per board). If you hit this in normal play, you're submitting more often than you need to.

### Too many active play sessions

Play sessions are capped per player (enforced by the backend). End sessions when runs finish (`POST /play-sessions/end`); when testing, use a fresh `playerId` rather than accumulating sessions on one.

### `Too many pending device authorizations. Try again shortly.` (HTTP 503)

The device-code sign-in flow has a cap on outstanding unapproved codes. Transient — wait a moment and request a new code.

### `Google client ID not registered for this game. Add your client ID in the CheddaBoards dashboard.`

(And the Apple equivalent: `Apple bundle ID not registered for this game. Add your bundle ID in the CheddaBoards dashboard.`) Sign-in requires your OAuth client ID / bundle ID to be configured on the game in the Developer Console first — this is a game-setup issue, not a player error.

### Invalid path segment (HTTP 400)

Game and scoreboard IDs in URL paths must be 1–64 characters of letters, digits, `_` or `-`. Anything else is rejected before reaching the backend. Usually this means a bug in how you build the URL — an unescaped string, an uninitialized buffer, or a stray null byte.

## Session expiry

Sessions last 30 days and renew on use, so active players stay signed in indefinitely. Any `401`/`403` on a session-authenticated request means the session is dead: clear the stored token, fall back to your sign-in flow, and don't retry the request with the same token. The official SDKs treat this as an automatic sign-out.

## When it's not you

Occasionally the chain itself has a transient wobble (a subnet replica upgrade, for example) and you'll see a `5xx` for a few seconds. Submits are [safe to retry](/quickstart/rest#notes), so a single retry with a short backoff covers it. If the API is unreachable entirely, board *reads* still work [directly from the canister](/quickstart/rest#reading-boards-straight-from-the-chain).

**See also:** [REST quick start](/quickstart/rest) · [Authentication](/api/authentication) · [Anti-cheat](/concepts/anti-cheat)