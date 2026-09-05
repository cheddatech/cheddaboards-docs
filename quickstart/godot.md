# Godot quick start

**Add leaderboards to a game you've already built** — copy one folder, wire a few calls. Works on web, desktop, and mobile.

::: tip Starting from scratch, or just trying it out?
The full template is a working Godot 4 project with an example game, menus, and a leaderboard already wired up. Open it, run the Setup Wizard, and you're submitting scores in ~3 minutes — see the [Godot 4 guide](/engines/godot-4). This page is the path for adding CheddaBoards to a game you already have.
:::

## Before you start

- **Godot 4.6+.** This guide uses `await` (Godot 4 syntax). On **Godot 3.6**, replace `await CheddaBoards.wait_until_ready()` with `yield(CheddaBoards, "sdk_ready")` — see the [Godot 3.6 guide](/engines/godot-3).
- **A game that already produces a score** and has a game-over moment to submit from.
- **A CheddaBoards game** — register one at [cheddaboards.com](https://cheddaboards.com/developers) and copy your **Game ID** (`my-game`) and **API key** (`cb_my-game_xxxxxxxxx`).

## Step 1 — Add the addon

**Recommended — the [Godot Asset Store](https://store.godotengine.org/asset/cheddatech/cheddaboards) package.** It's the addon-only build and ships the editor plugin files: drop `addons/cheddaboards/` into your project, enable **CheddaBoards** under **Project → Project Settings → Plugins**, and the autoload registers itself. Done.

**Alternatively — from [GitHub](https://github.com/cheddatech/cheddaboards-godot).** The repo is the full template; copy just the `addons/cheddaboards/` folder out of it. That copy has no plugin files, so register the autoload yourself — either run the wizard (`File → Run → addons/cheddaboards/SetupWizard.gd`) or add it manually under **Project → Project Settings → Autoload**:

```
Name: CheddaBoards
Path: res://addons/cheddaboards/CheddaBoards.gd
```

## Step 2 — Wire it up

Everything below goes in **one script** — wherever your game starts (e.g. `MainMenu.gd`): credentials, login, submitting a score, and reading the leaderboard.

```gdscript
extends Control  # or whatever your start scene is

func _ready():
    # Credentials must come before any other CheddaBoards call.
    CheddaBoards.set_api_key("cb_my-game_xxxxxxxxx")
    CheddaBoards.set_game_id("my-game")

    # Connect the leaderboard signal ONCE here — not inside a function,
    # or you'll reconnect it every time you open the board.
    CheddaBoards.leaderboard_loaded.connect(_on_leaderboard)

    # Wait for the SDK, then log in.
    # submit_score fails until login has completed.
    await CheddaBoards.wait_until_ready()
    CheddaBoards.login_anonymous("PlayerName")


# Call from YOUR game-over code, with the final score and streak.
func _on_game_over(score: int, streak: int):
    CheddaBoards.submit_score(score, streak)


# Call when you want to show the board (e.g. a button press).
func show_leaderboard():
    CheddaBoards.get_leaderboard("score", 100)


# Fires when get_leaderboard() returns. Connected once, in _ready().
func _on_leaderboard(entries: Array):
    for e in entries:
        print("#%d %s - %d" % [e.rank, e.nickname, e.score])
```

That's the whole integration: call `_on_game_over(score, streak)` when a run ends, and `show_leaderboard()` from a button. You're on the board. For anti-cheat, add Step 3.

## Step 3 — Anti-cheat play sessions (recommended)

A **play session** tells the backend a real run just started, so it can validate the score against elapsed time and reject anything impossible. Three calls:

- **Start** when a run *actually begins* — at the start of gameplay, not in `_ready()`.
- **Submit** as normal. The SDK attaches the active session token for you; you don't pass it manually.
- **Clear** once submission finishes — on both success *and* failure.

```gdscript
func _ready():
    # …credentials + login from Step 2…
    CheddaBoards.score_submitted.connect(_on_score_submitted)
    CheddaBoards.score_error.connect(_on_score_error)
    CheddaBoards.play_session_error.connect(_on_session_error)

# The moment the player starts a run.
func start_run():
    if CheddaBoards.is_ready():
        CheddaBoards.start_play_session()
    # …your own game-start code…

# Run ends — submit. The session token is attached automatically.
func _on_game_over(score: int, streak: int):
    CheddaBoards.submit_score(score, streak)

func _on_score_submitted(score: int, streak: int):
    CheddaBoards.clear_play_session()

func _on_score_error(reason: String):
    CheddaBoards.clear_play_session()

# Non-fatal: the score still submits, it just won't be time-validated.
func _on_session_error(reason: String):
    push_warning("Play session error: %s" % reason)
```

Set the actual limits (max score per submission, streak caps) from your dashboard's **Security** tab — see [Anti-cheat](/concepts/anti-cheat). Skip the session entirely and scores still submit; they just won't be time-validated.

## Done

Anonymous login, score submission, global leaderboards, and anti-cheat play sessions — on web, desktop, and mobile, in about ten minutes.

## Quick reference

### Sign-in

```gdscript
# Anonymous — works everywhere, no account needed
CheddaBoards.login_anonymous("PlayerName")

# Google / Apple on any platform, via device code
CheddaBoards.login_with_device_code()

CheddaBoards.device_code_received.connect(func(user_code, verification_url, qr_data_url):
    print("Go to %s and enter: %s" % [verification_url, user_code])
    # qr_data_url is a base64 PNG — decode into a TextureRect for scanning.
)
CheddaBoards.device_code_approved.connect(func(nickname):
    print("Welcome, %s!" % nickname)
)

if CheddaBoards.is_authenticated():
    print("Logged in as ", CheddaBoards.get_nickname())
```

Device code sign-in is a **one-time** flow — the session is saved to `user://` and restored on startup, so returning players are already signed in. If the server rejects a stored session, the SDK clears it and emits `session_expired` + `logout_success`. Full flow: [Authentication](/api/authentication).

### Scores & leaderboards

```gdscript
CheddaBoards.submit_score(1000, 5)          # score, streak
CheddaBoards.get_leaderboard("score", 100)  # "score" or "streak"
CheddaBoards.get_scoreboard("weekly-scoreboard", 50)
CheddaBoards.get_player_rank()
```

### Nicknames

```gdscript
CheddaBoards.change_nickname("NewName")

CheddaBoards.nickname_changed.connect(func(new_nickname):
    print("Now playing as ", new_nickname)
)
CheddaBoards.nickname_error.connect(func(reason):
    print("Nickname change failed: ", reason)
)
```

Nicknames are **3–16 characters, letters, digits, and underscores**. A name that's already taken isn't an error — it's auto-suffixed (`Chedz` → `Chedz_1`) and `nickname_changed` reports the name actually applied. Only genuinely invalid names raise `nickname_error`, and that's permanent for that value — ask for a different one rather than retrying.

### Achievements (optional)

```gdscript
func _on_game_over(score: int, streak: int):
    Achievements.increment_games_played()
    Achievements.check_game_over(score, 0, streak)
    Achievements.submit_with_score(score, streak)
```

The `Achievements` autoload ships with the example game's achievements and check logic — replace the definitions *and* the `check_*` conditions for your own game. See [Achievements](/api/achievements). Full sync requires a signed-in account; anonymous players' achievements are stored locally and sync once they upgrade.

## Common issues

| Issue | Fix |
|-------|-----|
| "API key not set" / "Game ID not set" | Call `set_api_key(...)` and `set_game_id(...)` in `_ready()` before any other call (the SDK ships with empty defaults) |
| "Not authenticated" | Submit ran before login. `await wait_until_ready()` then `login_anonymous()` **before** any `submit_score()` |
| `await` won't parse | You're on Godot 3.6 — use `yield(CheddaBoards, "sdk_ready")`. See the [Godot 3.6 guide](/engines/godot-3) |
| 4-arg `profile_loaded` errors | `play_count` is now the 5th arg — add a trailing `play_count: int` |
| Score rejected as too fast / impossible | Start a play session before the run so the backend can time-validate it |
| Leaderboard fires twice / duplicates | You connected `leaderboard_loaded` inside a function — connect it once in `_ready()` |
| Leaderboard empty | Verify `game_id` matches the one in your dashboard |
| "CheddaBoards not found" | Enable the plugin (Asset Store install), add it to Autoloads, or run the Setup Wizard |
| Blank screen (web) | Serve it — `python3 -m http.server`, then the `localhost` URL, not `file://` |
| "Engine not defined" (web) | The web export must be named `index.html`, not `MyGame.html` |

Full list: [Errors](/api/errors).

**See also:** [Godot 4 guide](/engines/godot-4) (full template walkthrough) · [Signals reference](/engines/godot-signals) · [Anti-cheat](/concepts/anti-cheat) · [REST API](/quickstart/rest)