# Anti-cheat

Anti-cheat is built in and server-side. You set the limits from your dashboard and CheddaBoards enforces them on every submission — no game code required for caps and validation. **Play sessions**, which let the server check a score against real elapsed play time, are the one piece that touches your client (handled automatically by the official SDKs, a few calls on the REST path).

| Protection | How it works |
|------------|--------------|
| **Score & streak caps** | Reject any single submission above a per-round maximum, and reject scores past an absolute all-time ceiling |
| **Time validation** | With a play session, reject scores impossible for the elapsed time |
| **Rate limiting** | One submit per player per board every 2 seconds, always on |
| **Suspicion log** | Every rejection is recorded for you to review — the player only sees a generic error |

## Configuring limits

Set your limits from your game's **Security** tab in the Developer Console, based on your game's mechanics. Caps come in two tiers:

- **Per-round caps** — the most a single submission may add (e.g. max 200,000 points and max streak of 10 in one run). This catches a fabricated score in a single submit.
- **All-time caps** — an absolute ceiling a player's score or streak can never exceed, no matter how many legitimate runs. This catches slow accumulation past what's humanly possible.

There are no default caps: validation is per-game and entirely dashboard-driven, so a fast arcade game and a slow puzzle game can run completely different rules with no code change on either side. Start loose, then tighten as you see real player data.

Rate limiting is the exception — the 2-second-per-player-per-board throttle is always on and isn't configurable, since it only blocks bot-speed submission and never legitimate play.

## Play sessions

A play session is a server-tracked window around a single run. Start one when the run begins, pass its token when you submit, end it after. That token is what lets the backend compare the score against how long the run actually took, so a client that fabricates a huge score in two seconds gets caught.

The lifecycle over REST:

1. `POST /play-sessions/start` → returns a session token
2. `POST /scores` with `"playSessionToken": "<token>"` in the body
3. `POST /play-sessions/end`

Full worked example: [REST quick start §4](/quickstart/rest#_4-anti-cheat-play-sessions-recommended). The official SDKs do all three for you — see the [Godot guide](/engines/godot-4).

**If time validation is off**, session tokens are accepted but not checked — submits succeed with or without one. Wire the lifecycle up anyway: it costs nothing while validation is off, and the day you enable it on the dashboard your scores are already protected instead of suddenly rejected.

Sessions are capped per player, so always end them when a run finishes rather than leaving them open.

## What a rejected score looks like

When a submission trips a limit, the player gets a **deliberately generic** error:

```json
{"ok":false,"error":"rejected by game validation rules"}
```

The specific reason — which cap, by how much, the actual play duration — goes to your **suspicion log**, visible only to you as the game owner. This is intentional: if the error told the client exactly which limit it hit and by how much, a cheater could binary-search your caps until their fake scores slipped under. You get the detail; they get a wall.

Surface the generic error to the player as a soft "score not accepted" and check your suspicion log if you want to know what actually happened.

## Choosing caps

The caps are yours to tune, and the right values are entirely game-specific. A few principles:

- **Set the per-round max just above your best legitimate single run,** with headroom for the exceptional run, and the all-time cap above the highest total a real player could ever accumulate. Too tight and you reject your own top players; too loose and it does nothing.
- **Time validation is your strongest tool** for score-attack and endless games, where score scales with time survived — it makes "impossible in the time elapsed" the thing you're actually checking.
- **Start loose, watch the suspicion log, tighten.** The log tells you where real submissions cluster, which is the only reliable guide to where the ceiling should sit.
- Some games legitimately submit very fast or very often (per-kill boards, presence heartbeats). If yours does, lean on caps rather than expecting tight timing, and keep the per-board throttle in mind when you design submit frequency.

**See also:** [REST quick start](/quickstart/rest) · [Errors](/api/errors#rejected-by-game-validation-rules) · [Moderation](/concepts/moderation) · Godot SDK: [signals reference](/engines/godot-signals)