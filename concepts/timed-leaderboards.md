# Timed leaderboards

Run weekly competitions, daily challenges, and monthly tournaments — boards that reset on a schedule and archive their final standings so you can show past winners.

## The board types

| Type | Resets | Archives kept | Use case |
|------|--------|---------------|----------|
| **All-time** | Never | — | Career high scores |
| **Weekly** | Monday 00:00 UTC | 52 | Weekly competitions |
| **Daily** | Midnight UTC | 90 | Daily challenges |
| **Monthly** | 1st of month, 00:00 UTC | 12 | Monthly tournaments |
| **Custom interval** | Every N days | 52 | Sprints, fortnightly events |

Resets happen on calendar boundaries in UTC, not rolling windows — a weekly board always turns over at Monday 00:00 UTC, so every player's week starts and ends at the same moment.

::: tip Timed vs targeted
A board's reset cadence is independent of its write mode. By default a board is **fan-out** (receives every submit); you can instead make it **targeted** so it only receives scores sent to it by ID. Any cadence here works with either mode. See [Category boards](/concepts/category-boards).
:::

## Creating one

In the Developer Console → your game → **Scoreboards** → **Add Scoreboard**:

| Field | Example | Description |
|-------|---------|-------------|
| ID | `weekly-scoreboard` | Unique identifier |
| Name | `Weekly Challenge` | Display name |
| Reset Period | `Weekly` | When to archive & reset |
| Sort By | `Score (high to low)` | Ranking method |

For a custom cadence, choose **Custom interval (every N days)** and set the day count — e.g. `3` for a short sprint, `14` for a fortnightly event. Leave it blank and the board never auto-resets (same as All-Time).

## Submitting and reading

You don't submit to timed boards individually. Submit once, and the score fans out to every standard board on the game — all-time, weekly, daily — automatically:

```gdscript
CheddaBoards.submit_score(score, streak)
```

Read a specific board by ID:

```gdscript
CheddaBoards.get_scoreboard("weekly-scoreboard", 100)

func _on_scoreboard_loaded(scoreboard_id, config, entries):
    for entry in entries:
        print("#%d %s: %d pts" % [entry.rank, entry.nickname, entry.score])
```

```bash
curl "https://api.cheddaboards.com/games/my-game/scoreboards/weekly-scoreboard?limit=100" \
  -H "X-API-Key: cb_my-game_xxxxxxxxx" \
  -H "X-Game-ID: my-game"
```

## Archives

When a timed board resets, its final standings are snapshotted into an **archive** you can read back later — "last week's winners", a hall of fame, and so on. Resetting never throws results away.

### REST endpoints

| Endpoint | Returns |
|----------|---------|
| `GET /games/{gameId}/scoreboards/{id}/archives` | List of archived periods for a board |
| `GET /games/{gameId}/scoreboards/{id}/archives/latest` | The most recent archive (last week / yesterday / last month) |
| `GET /archives/{archiveId}` | One specific archive |
| `GET /games/{gameId}/archives/stats` | Archive statistics for the game |

```bash
curl "https://api.cheddaboards.com/games/my-game/scoreboards/weekly-scoreboard/archives/latest?limit=10" \
  -H "X-API-Key: cb_my-game_xxxxxxxxx" \
  -H "X-Game-ID: my-game"
```

An archive ID has the form `gameId:scoreboardId:timestamp` (the timestamp is nanoseconds, ICP-standard).

### Godot

The SDK wraps these with signals and a few convenience calls:

```gdscript
# Most recent archived period
CheddaBoards.get_last_archived_scoreboard("weekly-scoreboard", 100)
CheddaBoards.archived_scoreboard_loaded.connect(_on_archive)

func _on_archive(archive_id, config, entries):
    if entries.is_empty():
        return   # a brand-new board has no archives yet
    var winner = entries[0]
    print("Last week's champion: %s (%d pts)" % [winner.nickname, winner.score])

# Shorthands for the common cases
CheddaBoards.get_last_week_scoreboard()
CheddaBoards.get_yesterday_scoreboard()
CheddaBoards.get_last_month_scoreboard()

# List every archived period, e.g. for a hall of fame
CheddaBoards.get_scoreboard_archives("weekly-scoreboard")
CheddaBoards.archives_list_loaded.connect(_on_list)
```

The archive signals are in the [signals reference](/engines/godot-signals#scoreboard-archives). The included `Leaderboard.tscn` already wires an All-Time / Weekly toggle and a Current / Last-Period toggle, so on the template you get archive browsing without writing this yourself.

### The config dictionary

Archive and scoreboard reads carry a `config` describing the board and period:

```
name           display name
scoreboardId   the board's ID
resetPeriod    daily | weekly | monthly | custom | never
sortBy         score | streak
sortDirection  desc (high first) | asc
periodStart    nanosecond timestamp
periodEnd      nanosecond timestamp
```

Timestamps are nanoseconds since epoch — divide by 1,000,000,000 for seconds before handing to `Time.get_datetime_dict_from_unix_time()`.

## Retention

| Cadence | Archives kept |
|---------|---------------|
| Weekly | 52 (a year) |
| Daily | 90 |
| Monthly | 12 (a year) |
| Custom interval | 52 |

Archives don't change once written, so they're safe to cache client-side.

## Good practice

- **Always keep an all-time board** alongside timed ones — players want their career best, not just this week's.
- **Show current and last period together** — "This Week" / "Last Week" is the pairing players expect.
- **Celebrate winners** — a crown and a highlight on the #1 archive entry does a lot.

**See also:** [Category boards](/concepts/category-boards) · [What's stored](/concepts/data-model) · [REST quick start](/quickstart/rest) · [Godot signals](/engines/godot-signals)