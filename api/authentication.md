# Authentication

CheddaBoards supports three levels of identity, all cross-platform: **anonymous play**, **sign-in with Google or Apple** (Device Code, on any platform), and **account upgrade** (turn an anonymous player into a verified one without losing progress).

No OAuth SDKs, no browser popups, no platform-specific branching — every platform uses the same flow. Players who never sign in still get full leaderboard participation.

## Anonymous identity

There's no anonymous "login" call. An anonymous player is a **persistent ID you generate and store client-side** (the official SDKs use `dev_<unixtime>_<random>`). Send it as `playerId` with the API key; the first score submission creates the profile. See the [REST quick start](/quickstart/rest#players--anonymous-identity).

Anonymous progress is real progress — scores, streaks, plays, and achievements all live server-side and survive an upgrade to a verified account.

## Sign in with Google / Apple (Device Code)

The game shows a short code, a URL, and a QR. The player signs in on their phone at [cheddaboards.com/link](https://cheddaboards.com/link); the game polls until approved. No OAuth configuration on your side.

```
┌──────────────┐                    ┌──────────────────────┐
│  Your Game   │                    │  Player's Phone      │
│              │                    │                      │
│  "Scan QR or │                    │  cheddaboards.com/   │
│   go to      │                    │  link                │
│   cheddaboards                    │                      │
│   .com/link" │                    │  Enter: CHEDDA-7K3M  │
│              │                    │  [Google] [Apple]    │
│  "Enter code:│                    │                      │
│   CHEDDA-7K3M"│    polls every 5s │  ✅ Signed in!       │
│  ✅ Signed in!│◄──────────────────│                      │
└──────────────┘                    └──────────────────────┘
```

**1. Request a code:**

```bash
curl -X POST https://api.cheddaboards.com/auth/device/code \
  -H "Content-Type: application/json" \
  -H "X-Game-ID: my-game" \
  -d '{"gameId": "my-game", "nickname": "PlayerName"}'
```

Returns the `device_code` (yours, for polling), a short `user_code` (the player's, to type in), the verification URL, and a QR data URL — a base64 PNG encoding the verification URL with the code pre-filled, so the player scans once and taps a single button instead of typing. Show the user code and QR.

`nickname` is optional: if the sign-in ends up **creating** a brand-new account, that name seeds it (3–16 chars, letters/digits/underscores). Existing accounts always keep their name — a sign-in never renames anyone.

**2. Poll for approval** (every 5 seconds):

```bash
curl -X POST https://api.cheddaboards.com/auth/device/token \
  -H "Content-Type: application/json" \
  -H "X-Game-ID: my-game" \
  -d '{"device_code": "<device_code>"}'
```

The state machine:

| Response | State | Your move |
|----------|-------|-----------|
| `428` `authorization_pending` | Player hasn't finished on their phone | Keep polling every 5s |
| `200` with `sessionId` | Approved | Store the session, switch to `X-Session-Token` |
| Code expired (after **5 minutes**) | Player took too long | Request a fresh code |

On approval, the `200` payload includes `sessionId`, `nickname`, `email`, and the player's `gameProfile`. From here on, send `X-Session-Token: <sessionId>` instead of `X-API-Key`.

**A polish worth copying from the official SDKs:** when your app regains focus (the player switching back from their phone or another tab), fire an immediate poll instead of waiting for the next 5-second tick — sign-in then completes the instant they return.

## Sessions

Sessions last **30 days and renew on use**, so an active player stays signed in indefinitely. Persist the `sessionId` client-side and restore it on startup — players should go through device code **once**, not every visit.

Any `401`/`403` on a session-authenticated request means the session is dead (expired, logged out elsewhere, or the account was removed). Treat it as an automatic sign-out: discard the stored token, fall back to anonymous or your sign-in screen, don't retry with the same token. See [Errors](/api/errors#session-expiry).

## Upgrading anonymous → verified (account linking)

An anonymous player signs in via the same device code flow, and their anonymous progress migrates into the verified account. Everything is preserved: scores, streaks, achievements, play history.

**Merging is safe across devices.** If a player has been anonymous on two devices and links both to the same Google/Apple account, the second link **merges** rather than erroring: best score and best streak are kept per field, achievements are combined and deduplicated, and play counts add together. The message for your players: *link on every device and your best progress carries over.*

**Linking is one-way.** Migration absorbs the anonymous account and deletes it — there's nothing to unlink back to. When testing your own flow, use throwaway Google accounts and generate a fresh anonymous `playerId` each run.

**"Anonymous account not found" is harmless.** If a player links before ever submitting a score, there's no server-side anonymous profile to migrate, and the migration step reports that reason. Safe to ignore in your UX.

**Nicknames carry over.** When linking *creates* the account, it's born with the player's in-game name (seeded via the device-code request). If the anonymous profile still holds that name at creation time, the new account briefly gets a suffixed one (`Name_1`) and reclaims the exact name after the merge — so re-read the profile after migration completes rather than caching the name from the approval response.

**How it works over REST.** Sign the player in first (device code) so you hold their session, then call `/migrate-account` with the session token in the header and the anonymous device ID in the body:

```bash
curl -X POST https://api.cheddaboards.com/migrate-account \
  -H "Content-Type: application/json" \
  -H "X-Game-ID: my-game" \
  -H "X-Session-Token: <sessionId>" \
  -d '{"deviceId": "dev_1730000000_1a2b3c4d"}'
```

That's the anonymous `playerId` you'd been submitting under. On success the response reports what moved:

```json
{"ok":true,"data":{"migratedGames":1,"migratedScoreboards":3}}
```

The merge is safe to retry — if it fails mid-way the call returns a `500` and you can call it again.

## Which method when?

| You want | Use |
|----------|-----|
| Zero-friction play, no accounts | Anonymous `playerId` + API key |
| Cross-device progress | Device Code sign-in |
| Keep an existing player's progress when they sign up | Nothing special — linking handles it |

**See also:** [REST quick start](/quickstart/rest) · [Errors](/api/errors) · [Players and accounts](/concepts/accounts) · [Device code login](/concepts/device-code) · Godot SDK: [signals reference](/engines/godot-signals)