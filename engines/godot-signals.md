# Signals reference (Godot)

Every signal the Godot SDK emits, grouped by category. All are typed for Godot 4.x.

Connect the ones you need in `_ready()`. The [Godot quick start](/quickstart/godot) shows the common ones in context; this page is the complete list.

## CheddaBoards.gd

The SDK exposes 36 signals, grouped into the categories below.

### Initialization

```gdscript
signal sdk_ready()
signal init_error(reason: String)
```

### Authentication

```gdscript
signal login_success(nickname: String)
signal login_failed(reason: String)
signal logout_success()
signal session_expired()   # since v2.2.3
signal auth_error(reason: String)
```

`session_expired` (since v2.2.3) fires when the server rejects the stored session token — expired, revoked, or the account no longer exists. The saved session is cleared and `logout_success` **also** fires, so a menu that already handles `logout_success` needs no changes. Connect `session_expired` only to show something specific ("Session expired — please sign in again").

### Profile

```gdscript
signal profile_loaded(nickname: String, score: int, streak: int, achievements: Array, play_count: int)
signal no_profile()
signal nickname_changed(new_nickname: String)
signal nickname_error(reason: String)
```

`profile_loaded` gained `play_count` as its 5th argument in v2.2.0 — a four-argument handler from an older version must add a trailing `play_count: int`.

`nickname_changed` reports the name actually applied, which matters because a **taken** name is auto-suffixed (`Chedz` → `Chedz_1`) rather than rejected. `nickname_error` fires only for a genuinely invalid name — not 3–16 characters, or containing anything outside letters, digits, and underscores — and that rejection is permanent for that value, so prompt for a different name rather than retrying. See [Authentication](/api/authentication).

### Scores & global leaderboard

```gdscript
signal score_submitted(score: int, streak: int)
signal score_submitted_to_board(scoreboard_id: String, score: int, streak: int)   # since v2.2.2
signal score_error(reason: String)
signal leaderboard_loaded(entries: Array)
signal player_rank_loaded(rank: int, score: int, streak: int, total_players: int)
signal rank_error(reason: String)
```

`score_submitted_to_board` (since v2.2.2) fires on a successful submit to a targeted category board. See [Category boards](/concepts/category-boards).

### Scoreboards (time-based)

```gdscript
signal scoreboards_loaded(scoreboards: Array)
signal scoreboard_loaded(scoreboard_id: String, config: Dictionary, entries: Array)
signal scoreboard_rank_loaded(scoreboard_id: String, rank: int, score: int, streak: int, total: int)
signal scoreboard_error(reason: String)
```

### Scoreboard archives

```gdscript
signal archives_list_loaded(scoreboard_id: String, archives: Array)
signal archived_scoreboard_loaded(archive_id: String, config: Dictionary, entries: Array)
signal archive_stats_loaded(total_archives: int, by_scoreboard: Array)
signal archive_error(reason: String)
```

### Achievements

```gdscript
signal achievement_unlocked(achievement_id: String)
signal achievements_loaded(achievements: Array)
```

### Play sessions (anti-cheat)

```gdscript
signal play_session_started(token: String)
signal play_session_error(reason: String)
```

`play_session_error` is non-fatal — the score still submits, it just won't be time-validated. See [Anti-cheat](/concepts/anti-cheat).

### Account upgrade (anonymous → verified)

```gdscript
signal account_upgraded(profile: Dictionary, migration: Dictionary)
signal account_upgrade_failed(reason: String)
```

`account_upgraded` fires **after** `device_code_approved`, once the background migration of the player's anonymous progress lands — `migration` carries `migratedGames` and `migratedScoreboards` counts. Neither upgrade signal fires for a player with no anonymous history; for them, approval is the whole flow.

`account_upgrade_failed`'s reason comes from the server. `"Anonymous account not found"` is harmless — the player linked before ever submitting a score, so there was nothing to migrate. See [Authentication](/api/authentication#upgrading-anonymous-verified-account-linking).

### Device code auth

```gdscript
signal device_code_received(user_code: String, verification_url: String, qr_data_url: String)
signal device_code_approved(nickname: String)
signal device_code_expired()
signal device_code_error(reason: String)
```

`qr_data_url` is a base64 PNG of a QR encoding the full verification URL with the code pre-filled — decode and apply it to a `TextureRect` for scanning.

### HTTP (catch-all)

```gdscript
signal request_failed(endpoint: String, error: String)
```

## Achievements.gd

```gdscript
signal achievement_unlocked(achievement_id: String, achievement_name: String)
signal achievements_ready()
```

## Your game (Template wrapper)

If you build on the Template's `Game.gd` wrapper, your own game scene emits these — the wrapper listens and handles submission, the game-over screen, and achievements. **Only `game_over` is required;** each of the other three reveals its HUD panel only when your scene declares it, so omit the ones you don't need and those panels stay hidden.

```gdscript
signal game_over(final_score: int, stats: Dictionary)        # REQUIRED — wrapper can't submit without it
signal score_changed(score: int, combo: int)                 # optional — live score/combo HUD + mid-game achievement pops
signal stats_changed(hits: int, misses: int, level: int)     # optional — level/misses HUD
signal time_changed(time_remaining: float, max_time: float)  # optional — countdown timer HUD
```

Full breakdown of the contract and what each value does: [Godot 4 → the game_over contract](/engines/godot-4#the-game-over-contract).

**See also:** [Godot quick start](/quickstart/godot) · [Godot 4 guide](/engines/godot-4) · [Authentication](/api/authentication) · [Anti-cheat](/concepts/anti-cheat)