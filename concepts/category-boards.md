# Category boards

Run per-level, per-mode, or per-category leaderboards under a single game.

## Two independent dials

A CheddaBoards scoreboard has two settings that don't affect each other:

| Dial | Options | Controls |
|------|---------|----------|
| **Write mode** | Fan-out · Targeted | *Which* board a score lands on |
| **Reset cadence** | Never · Daily · Weekly · Monthly · Every N days | *When* the board resets — see [Timed leaderboards](/concepts/timed-leaderboards) |

This page is about the first dial. The two are orthogonal: a targeted board can still reset weekly, and a fan-out board can be all-time.

| Mode | Receives | Use case |
|------|----------|----------|
| **Fan-out** (default) | *Every* plain score submit | One overall leaderboard per game |
| **Targeted** | *Only* scores addressed to it by ID | `level-01 … level-28`, `boss-rush`, `time-trial`, `runs`, difficulty tiers |

A plain submit fans out to every non-targeted board on the game. A **targeted** board is invisible to that fan-out — it only ever receives scores you send to it explicitly, by its ID. That's what lets you run a separate leaderboard per level (or per mode/category) without registering a separate game for each.

## When to use targeted boards

- **Per-level boards** — a leaderboard for every level in your game.
- **Per-mode boards** — Easy / Normal / Hard, or Solo / Co-op.
- **Category boards** — fastest time, longest run, most coins, kept separate from your main score board.

If you just want one leaderboard for the whole game (plus optional weekly/daily resets), you don't need targeted boards — stick with fan-out.

## Creating one

In the Developer Console → your game → **Scoreboards** → **Create New Scoreboard**:

| Field | Example | Description |
|-------|---------|-------------|
| Scoreboard ID | `level-14` | Unique identifier (lowercase, digits, hyphens) |
| Display Name | `Level 14` | Shown in your UI |
| **Board Type** | **Targeted** | This is what makes it a category board |
| Reset Period | `All Time` | Any cadence works, including every-N-days |
| Sort By | `Score (high to low)` | Ranking method |

The **Board Type** selector is the whole trick: leave it on *Fan-out* and the board behaves normally; set it to *Targeted* and it drops out of the fan-out and waits for scores sent to its ID. A targeted board ranks scores exactly like any other (keep-highest per player, sorted by score or streak) — "targeted" only changes *which* submits reach it, not how it ranks them.

## Submitting to a targeted board

### REST (any engine)

A targeted submit is a normal `POST /scores` with a `scoreboardId` field added:

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

On success the response confirms the board: `"Submitted to level-14 - Score: 1000, Streak: 0"`. If time validation is enabled, include a `playSessionToken` exactly as for a normal submit — targeted submits go through the same anti-cheat gate. Full mechanics: [REST quick start](/quickstart/rest#submitting-to-one-specific-board-category-targeted-scoreboards).

### Godot

```gdscript
# Send this run's score to ONE board, by ID.
CheddaBoards.submit_score_to_board("level-14", score, streak)
```

This writes to `level-14` only — no fan-out to your all-time/weekly/daily boards. You can address several boards in one run (e.g. a per-level board plus a shared `runs` board):

```gdscript
CheddaBoards.submit_score_to_board("level-14", score, streak)
CheddaBoards.submit_score_to_board("runs", score, streak)
```

The submission throttle is keyed per board, so these back-to-back calls won't trip the 2-second rate gate.

## Reading a targeted board

No different from any other board — same call, same signal, same REST path:

```gdscript
CheddaBoards.get_scoreboard("level-14", 100)

func _on_scoreboard_loaded(scoreboard_id, config, entries):
    for entry in entries:
        print("#%d %s: %d pts" % [entry.rank, entry.nickname, entry.score])
```

```bash
curl "https://api.cheddaboards.com/games/my-game/scoreboards/level-14?limit=100" \
  -H "X-API-Key: cb_my-game_xxxxxxxxx" \
  -H "X-Game-ID: my-game"
```

## How a targeted submit behaves

- **One board only.** It writes to the board you named and nothing else — no fan-out.
- **Play count, not bests.** A targeted submit counts toward the player's play count for the game, but the aggregate profile's score/streak bests only move on a plain submit. If you also want the run reflected in the player's overall bests, send a separate `submit_score(...)`.
- **Same anti-cheat.** Play-session / time-validation and rate-limit rules are identical to a plain submit.
- **Per-board throttle.** The 2-second gate is keyed per (player, game, board), so chaining several board submits in one run is fine.
- **Must exist and be targeted.** The board has to exist *and* be marked Targeted. Submitting a `scoreboardId` for a board that doesn't exist returns `"Scoreboard '<id>' not found for this game."` — the API never auto-creates a board on submit. See [Errors](/api/errors).

## Combining with reset cadence

Targeted and timed are independent, so you can mix them:

- **All-time per-level boards** — `level-01 … level-28`, each Targeted + All Time. Career bests per level.
- **Weekly category board** — a `time-trial` board, Targeted + Weekly, archiving each week.
- **Every-N-days event** — a `sprint` board, Targeted + Custom interval (e.g. every 3 days).

When a targeted board has a reset cadence, it archives on reset just like any timed board — see [Timed leaderboards](/concepts/timed-leaderboards).

## Good practice

- **Keep IDs predictable** — `level-01`, `level-02` (zero-padded) so you can build the board ID programmatically from the current level.
- **Decide whether targeted runs also count globally** — they don't update the aggregate bests; send both a targeted and a plain submit if they should.
- **Don't over-create boards** — per-level for a 28-level game is fine; per-level for 500 procedural levels probably isn't.
- **Pre-create boards in the dashboard** — a targeted submit fails if the board doesn't exist yet.

**See also:** [Timed leaderboards](/concepts/timed-leaderboards) · [REST quick start](/quickstart/rest) · [What's stored](/concepts/data-model) · [Errors](/api/errors)