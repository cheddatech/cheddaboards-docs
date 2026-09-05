# Scores

`POST /scores` submits a score. One endpoint covers both a normal (fan-out) submit and a submit to a single targeted board — the difference is one field.

This is the reference for the endpoint. For a walkthrough, see the [REST quick start](/quickstart/rest#_1-submit-a-score).

## Request

```
POST https://api.cheddaboards.com/scores
```

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |
| `X-Game-ID` | your Game ID |
| `X-API-Key` | your API key (anonymous / API-key submit) |
| `X-Session-Token` | the player's session (signed-in submit — send this *instead of* the API key) |

### Body

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `playerId` | string | yes | The player's persistent ID (`dev_<unixtime>_<random>` for anonymous) |
| `gameId` | string | yes | Your Game ID (also sent as the header) |
| `score` | number | yes | The run's score |
| `streak` | number | yes | The run's streak (send `0` if your game has no streak concept) |
| `nickname` | string | no | Applied if valid; see [nicknames](#nicknames) |
| `playSessionToken` | string | no | From `/play-sessions/start`; required only if the game has time validation on |
| `scoreboardId` | string | no | Present → targeted submit to that one board; absent → fan-out. See [targeted submits](#targeted-submits) |

## Response

Success:

```json
{"ok":true,"data":{"message":"🎉 New high score and streak! Score: 1234, Streak: 3"}}
```

Check the `ok` field for success — `message` is human-readable feedback for the player (it varies: "New high score", "Score submitted", etc.), not a structured value to parse. On failure:

```json
{"ok":false,"error":"<reason>"}
```

## Fan-out submits (the default)

A submit with **no `scoreboardId`** fans out: the score is recorded against the player's profile and applied to every one of the game's standard time-based boards — all-time, weekly, daily, and any custom fan-out boards. One call, every standard board updated. This is what you want for a normal "player finished a run" submit.

Only the player's **best** survives on each board — submitting a lower score never replaces a higher one, and score and streak are kept as independent maxima. See [what's stored](/concepts/data-model#the-leaderboard-entry).

## Targeted submits

Add a `scoreboardId` and the submit goes to **that one board only** — no fan-out. This is how you run per-level or per-category leaderboards:

```json
{
  "playerId": "dev_1730000000_1a2b3c4d",
  "gameId": "my-game",
  "score": 1000,
  "streak": 5,
  "scoreboardId": "level-14"
}
```

Behavior specific to targeted submits:

- **One board, no fan-out.** Writes only to the named board.
- **Counts plays, not aggregate bests.** A targeted submit increments the player's play count but doesn't move their aggregate profile score/streak — send a plain submit as well if you want both.
- **Per-board throttle.** The 2-second rate limit is keyed per board, so chaining several targeted submits in one run (e.g. a level board plus a shared `runs` board) is fine.
- **The board must exist and be targeted.** Submitting a `scoreboardId` for a board that doesn't exist returns `"Scoreboard '<id>' not found for this game."` — the API never auto-creates a board. Create it in the console first (Board Type → Targeted).

Full treatment: [Category boards](/concepts/category-boards).

## Nicknames

An optional `nickname` on a submit is applied subject to the rule **3–16 characters, letters, digits, and underscores** (`A–Z a–z 0–9 _`). A **taken** name isn't an error — it's auto-suffixed (`Chedz` → `Chedz_1`). A genuinely **invalid** name is rejected and the player keeps their existing or default (`Player_<n>`) name. See [Errors → nickname](/api/errors#nickname-rejected).

## Anti-cheat & time validation

If the game has time validation enabled, include a `playSessionToken` from [`/play-sessions/start`](/quickstart/rest#_4-anti-cheat-play-sessions-recommended) so the backend can check the score against elapsed play time. Without validation enabled, the token is accepted but not checked.

A score that trips a cap or time check is rejected with a generic `"rejected by game validation rules"` — the specific reason goes to your dashboard's suspicion log, not the client, so cheaters can't probe your limits. See [Anti-cheat](/concepts/anti-cheat).

## Rate limit

**One submit per player per board every 2 seconds**, enforced server-side. It's always on and not configurable — it only blocks bot-speed submission, never legitimate play. Because it's keyed per board, back-to-back submits to *different* boards don't trip it.

## Retry safety

Submits are safe to retry. The backend keeps per-player bests, so resending a score after a timeout can never lower a score or streak — no client-side dedupe needed. The one thing a duplicate submit moves is the player's play count, so avoid blind retry *loops* if play counts matter to you.

**See also:** [REST quick start](/quickstart/rest) · [Scoreboards](/api/scoreboards) · [Category boards](/concepts/category-boards) · [Errors](/api/errors) · [What's stored](/concepts/data-model)