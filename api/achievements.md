# Achievements

Achievements are stored server-side, work for anonymous and signed-in players alike, and sync independently of score submission — so a slow or failed achievement call never blocks a score from landing.

Anonymous players' achievements live client-side and migrate into the account when they [upgrade to a verified sign-in](/api/authentication#upgrading-anonymous-verified-account-linking); a signed-in player's achievements are stored against their account and follow them across devices.

## Unlock achievements

`POST /achievements` unlocks one or more achievements for a player. It takes either a single ID or an array — send the array whenever you're unlocking more than one at once, since a batch is a single call instead of one per achievement.

**Single:**

```bash
curl -X POST https://api.cheddaboards.com/achievements \
  -H "Content-Type: application/json" \
  -H "X-API-Key: cb_my-game_xxxxxxxxx" \
  -H "X-Game-ID: my-game" \
  -d '{
    "playerId": "dev_1730000000_1a2b3c4d",
    "gameId": "my-game",
    "achievementId": "first_win"
  }'
```

**Batch** — pass `achievementIds` as an array:

```bash
curl -X POST https://api.cheddaboards.com/achievements \
  -H "Content-Type: application/json" \
  -H "X-API-Key: cb_my-game_xxxxxxxxx" \
  -H "X-Game-ID: my-game" \
  -d '{
    "playerId": "dev_1730000000_1a2b3c4d",
    "gameId": "my-game",
    "achievementIds": ["first_win", "combo_10", "level_5"]
  }'
```

Prefer the batch form for anything more than a single unlock. Under the hood a batch is one backend call; firing many single unlocks back-to-back is slower and can run into the [rate limit](/api/errors#rate-limited). Unlocking is idempotent — re-sending an achievement the player already has is harmless, so you don't need to track locally which ones have been sent.

The response reports the batch outcome and a per-achievement breakdown:

```json
{
  "ok": true,
  "data": {
    "message": "2/2 achievements unlocked",
    "unlocked": 2,
    "total": 2,
    "results": [
      { "achievementId": "first_win", "success": true, "message": "unlocked" },
      { "achievementId": "combo_10", "success": true, "message": "unlocked" }
    ]
  }
}
```

For a signed-in player, send the session token instead of the API key:

```bash
curl -X POST https://api.cheddaboards.com/achievements \
  -H "Content-Type: application/json" \
  -H "X-Session-Token: <sessionId>" \
  -H "X-Game-ID: my-game" \
  -d '{"gameId": "my-game", "achievementIds": ["first_win", "combo_10"]}'
```

## Reading a player's achievements

There's no separate achievements-read endpoint — a player's unlocked achievement IDs come back inside their `gameProfile`, on both the [profile endpoint](/api/players) and every sign-in response:

```json
{
  "ok": true,
  "data": {
    "nickname": "PlayerName",
    "gameProfile": {
      "score": 1234,
      "streak": 3,
      "achievements": ["first_win", "combo_10"],
      "playCount": 2
    }
  }
}
```

So fetching the profile is how you read achievements; you rarely need a dedicated call.

## Defining achievements

Achievements are identified by a string ID you choose (`first_win`, `combo_10`, `level_5`). There's no separate "register the achievement" step on the API — you unlock IDs and the backend records them; the human-readable name and description live in your game, not the server. Keep the IDs stable once players start earning them, since the ID is what's stored.

## Sync model

The design is **score-first**: your game submits the score immediately and syncs achievements separately, so achievement traffic never delays a score landing on the board. If an unlock call fails (network blip, transient `5xx`), it's safe to retry — because unlocking is idempotent, re-sending the whole set the player has earned this session is a clean way to recover, no per-ID bookkeeping needed.

The official SDKs do this batching and retry for you; on the REST path, gather the run's newly-earned IDs and send them as one `achievementIds` batch after the score submits.

**See also:** [REST quick start](/quickstart/rest) · [Players](/api/players) · [Authentication](/api/authentication) · Godot SDK: [signals reference](/engines/godot-signals)