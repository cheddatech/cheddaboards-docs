# Players

Reading a player's profile and rank, and changing nicknames.

## Get a player's profile

```
GET /players/{playerId}/profile
```

```bash
curl "https://api.cheddaboards.com/players/dev_1730000000_1a2b3c4d/profile" \
  -H "X-API-Key: cb_my-game_xxxxxxxxx" \
  -H "X-Game-ID: my-game"
```

```json
{
  "ok": true,
  "data": {
    "nickname": "PlayerName",
    "created": 1788570532131407400,
    "gameProfile": {
      "score": 1234,
      "streak": 3,
      "achievements": ["first_win", "combo_10"],
      "playCount": 2,
      "lastPlayed": 1788571122315540500
    }
  }
}
```

The `gameProfile` holds the player's bests and totals for this game: `score` and `streak` (independent maxima), `playCount`, and the `achievements` they've unlocked — so this one call also gives you their achievements, no separate request needed. `created` and `lastPlayed` are **nanosecond** timestamps (divide by 1,000,000 for JavaScript milliseconds).

For a **signed-in** player, the equivalent is `GET /auth/profile` using the session token instead of the API key.

## Get a player's rank

```
GET /games/{gameId}/scoreboards/{scoreboardId}/rank
```

Returns the player's position on a specific board. This is a **signed-in** call — it's keyed on the player's session (send `X-Session-Token`), and it ranks against the actual board the player sees, so the rank and total match the visible leaderboard rather than a separate population. Use it to show "you're #40 of 68" on a given board without pulling the whole thing.

## Change a nickname

Two endpoints, depending on how the player is identified:

```
PUT /players/{playerId}/nickname     # anonymous — body: { "nickname": "..." }
PUT /profile/nickname                # signed-in — X-Session-Token, body: { "nickname": "..." }
```

The rule is the same on both: **3–16 characters, letters, digits, and underscores** (`A–Z a–z 0–9 _`).

- A **taken** name isn't an error — it's auto-suffixed (`Chedz` → `Chedz_1`) and the response reports the name actually applied.
- A genuinely **invalid** name is rejected with one of: `Nickname must be at least 3 characters`, `Nickname must be 16 characters or less`, `Nickname can only contain letters, numbers, and underscores`. That rejection is permanent for that value — ask for a different name rather than retrying.

## Identity, briefly

`playerId` is the player's private identifier — the `dev_<unixtime>_<random>` ID your game generates for anonymous players, or the account behind a signed-in one. It's never shown to other players; only the nickname is public. The conceptual picture is in [Players and accounts](/concepts/accounts).

**See also:** [Scores](/api/scores) · [Authentication](/api/authentication) · [What's stored](/concepts/data-model) · [Errors](/api/errors)