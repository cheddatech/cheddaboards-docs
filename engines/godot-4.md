# Godot 4

The complete guide to building on the CheddaBoards template — from a first run to your own game on a live leaderboard. If you just want to add leaderboards to a game you already have, the [Godot quick start](/quickstart/godot) is the shorter path; this page is for building *on* the template and its wrapper.

## What the template gives you

The template is a working Godot 4 project. Out of the box it has a main menu, anonymous and Google/Apple sign-in, a leaderboard scene with all-time / weekly / daily tabs, achievements, and an example game (**CheddaClick**) already wired up. You replace the example game with your own and keep everything else.

The key idea: a **wrapper** (`scenes/Game.tscn`) hosts your game. It loads your game scene as a child, draws the HUD, shows the game-over screen, and talks to CheddaBoards — login, submit, achievements, the anti-cheat session. Your side of the deal is emitting **one signal** when a run ends. That's the whole integration.

::: tip New to Godot entirely?
The [zero-experience path](#zero-to-leaderboard) below walks the whole thing from installing Godot to a real score on a live board, in about 20 minutes, assuming nothing.
:::

## Requirements

- **Godot 4.6 or newer** — free from [godotengine.org](https://godotengine.org), a single download, no installer. (On Godot 3.6, see the [3.6 guide](/engines/godot-3).)
- **A CheddaBoards game** — register at [cheddaboards.com](https://cheddaboards.com/developers) for a Game ID and API key.
- **The template** — from the [Godot Asset Store](https://store.godotengine.org/asset/cheddatech/cheddaboards) or [GitHub](https://github.com/cheddatech/cheddaboards-godot).

## Zero to leaderboard

If you're new to Godot, this is the whole path. Comfortable already? Skip to [the game_over contract](#the-game-over-contract).

### A 60-second vocabulary

- **Scene** — a reusable piece of your game: a screen, a whole minigame, an object. The template is built from several.
- **Node** — a building block inside a scene: a button, an image, a timer.
- **Autoload** — a script Godot keeps loaded all the time, reachable from anywhere by name. That's why any script can just call `CheddaBoards.something`.
- **Signal** — a "this just happened" message a node sends out for other code to listen for. The template listens for your game's `game_over` signal.
- **Inspector** — the panel showing the settings of whatever node you've clicked.
- **F5** plays the *whole project* (starts at the menu). **F6** plays *only the scene you're editing*. This difference matters — see the login trap below.

### 1. Run the template

Before changing anything, confirm it works. Download and unzip the template, open Godot, click **Import**, find the template's `project.godot`, and open it. Press **F5**. You should land on the CheddaBoards main menu — start a game as an anonymous guest, and CheddaClick loads. That's the whole thing running before you've touched code.

### 2. Connect your account with the Setup Wizard

Right now scores have nowhere of *yours* to go. Register a game at [cheddaboards.com](https://cheddaboards.com/developers) and copy your **API key** (`cb_my-game_xxxxxxxxx`) — your Game ID is baked into it, so that's all you need.

In Godot: **File → Run**, then choose `addons/cheddaboards/SetupWizard.gd`. Paste your API key when prompted. The wizard registers the three autoloads (`CheddaBoards`, `Achievements`, `MobileUI`) and writes your key and Game ID into `MainMenu.gd`.

Check it worked: **Project → Project Settings → Autoload** should list `CheddaBoards`, `Achievements`, and `MobileUI`.

### 3. Prove the pipeline with a one-button "game"

Build the smallest thing that scores and ends, just to watch a score travel from a click to the board.

1. **Scene → New Scene → User Interface** (a `Control` root). Save as `your_game/TestGame.tscn`.
2. Add a **Button** child.
3. Attach a script to the root, `TestGame.gd`:

```gdscript
extends Control

signal game_over(final_score: int, stats: Dictionary)

func _ready():
    $Button.pressed.connect(_on_button_pressed)

func _on_button_pressed():
    game_over.emit(500, {})   # pretend the player finished a run worth 500
```

4. Open `scenes/Game.tscn`, select the **Game** node, set **Game Scene Path** to `res://your_game/TestGame.tscn`.
5. Press **F5**, log in at the menu, and click the button in your test game.

You should see the game-over screen with **Final Score: 500**, then "Saving score…" → "Score saved!", and your name and 500 on the Leaderboard. If so, the full pipeline works: **your game → wrapper → CheddaBoards → leaderboard.**

::: warning The login trap
Run with **F5** (whole project), not **F6** (this scene alone). Login happens at the main menu — launch the `Game` scene by itself and you're never logged in, so you'll see "Offline — score not saved" instead of a saved score.
:::

## The game_over contract

Your game is its own scene. The wrapper loads it and waits for one required signal:

```gdscript
signal game_over(final_score: int, stats: Dictionary)

func _end_run():
    game_over.emit(score, {
        "hits": hits,
        "misses": misses,
        "max_combo": max_combo,
        "level": level,
        "accuracy": accuracy,   # 0–100
    })
```

When this fires, the wrapper shows the game-over screen, submits the score, checks achievements, and closes the anti-cheat session. **You don't call `submit_score` yourself.**

### Where each value goes

This is the part that trips people up: the dict *looks* like it all gets saved, but a leaderboard entry is only ever **two numbers — score and streak.** Here's what the wrapper does with what you emit:

| Value | Where it goes |
|-------|---------------|
| `final_score` (1st arg) | **Saved** as the player's **score** |
| `max_combo` | **Saved** as the player's **streak** — and checked for combo achievements |
| `hits` | Fed into the game-over achievement check; **not saved** |
| `level` | Shown on the game-over screen (`Level: N`); **not saved** |
| `accuracy` | Shown on the game-over screen (`Accuracy: N%`); **not saved** |
| `misses` | Drives the live HUD via `stats_changed`; not read at game-over |
| any other key | **Ignored** — the wrapper reads only the five above |

Two takeaways:

- **"Streak" is whatever you put in `max_combo`.** If your streak isn't a combo — days in a row, kills in a row, anything — put that number in `max_combo` and it ranks as the streak. (Or use the [drop-in path](/quickstart/godot) and call `submit_score(score, your_streak)` directly.)
- **Custom keys do nothing.** The score API has no free-form field, so a custom stat isn't saved unless you map it onto score/streak. See [what's stored](/concepts/data-model).

The game-over screen shows only the fields you send — omit `accuracy` and the Accuracy line simply doesn't appear (no fallback to `0%`). A game that tracks none of them gets a clean screen: title, final score, buttons.

## Feeding the built-in HUD (optional)

Add any of these three signals; each panel appears **only if your scene declares its signal**, so unused panels stay hidden rather than showing empty:

```gdscript
signal score_changed(score: int, combo: int)                # live score + combo
signal stats_changed(hits: int, misses: int, level: int)    # two stat slots
signal time_changed(time_remaining: float, max_time: float) # countdown timer
```

| Signal | HUD result |
|--------|-----------|
| `score_changed` | Updates **Score** and **Combo**, colours the combo by tier, runs live achievement checks |
| `stats_changed` | Fills two slots, hard-labelled **Level** and **Misses** |
| `time_changed` | Updates the **timer** (yellow ≤30s, red ≤10s) |

The two stat slots are hard-labelled Level and Misses — if your game's concepts don't map onto those, pass your nearest equivalent or skip `stats_changed` and the panel doesn't render. Skipping `score_changed` doesn't cost you achievements; score/combo checks just run once at game-over instead of live.

## Pointing the wrapper at your scene

Two ways:

- **Inspector (recommended):** open `scenes/Game.tscn`, select the **Game** node, set **Game Scene Path** to `res://your_game/YourGame.tscn`.
- **In code:** `@export var game_scene_path: String = "res://your_game/YourGame.tscn"`.

::: warning Moved MainMenu or Leaderboard?
The game-over **Main Menu** and **Leaderboard** buttons default to `res://scenes/MainMenu.tscn` and `res://scenes/Leaderboard.tscn`. If your project keeps them elsewhere, set the **Main Menu Scene** and **Leaderboard Scene** export vars on the **Game** node, or those buttons fail silently. Stock layout works as-is.
:::

## Play Again, titles, and cleanup (optional)

**Play Again** reloads the scene by default. If your game can reset in place, add a `restart()` method and the wrapper calls that instead:

```gdscript
func restart():
    # reset state to the start of a run
    pass
```

**Game-over titles** come from score thresholds, both export vars on the **Game** node:

```gdscript
@export var title_thresholds: Array[int] = [10000, 5000, 2500, 1000]
@export var game_over_titles: Dictionary = {
    "amazing": "AMAZING!", "excellent": "Excellent!",
    "great": "Great Game!", "good": "Good Effort!", "default": "Game Over",
}
```

A score ≥ the first threshold gets "amazing", on down; below the last gets "default".

Once your game runs cleanly, you can delete `example_game/` — just make sure `game_scene_path` no longer points into it. Many people keep it as a reference.

## Complete minimal example

A compilable game scene that satisfies the contract end to end. Drop it on a `Node2D`, wire your gameplay into `register_hit` / `register_miss`, and point the wrapper at it.

```gdscript
extends Node2D
## Minimal game that works with the CheddaBoards template.
## Replace the body with real gameplay — keep the signals.

signal game_over(final_score: int, stats: Dictionary)          # required
signal score_changed(score: int, combo: int)                   # optional HUD
signal stats_changed(hits: int, misses: int, level: int)       # optional HUD
signal time_changed(time_remaining: float, max_time: float)    # optional HUD

var score := 0
var combo := 1
var max_combo := 1
var hits := 0
var misses := 0
var level := 1
var time_left := 60.0
const ROUND_LENGTH := 60.0

func _ready():
    time_left = ROUND_LENGTH
    time_changed.emit(time_left, ROUND_LENGTH)
    score_changed.emit(score, combo)
    stats_changed.emit(hits, misses, level)

func _process(delta):
    time_left -= delta
    time_changed.emit(time_left, ROUND_LENGTH)
    if time_left <= 0.0:
        _end_run()

func register_hit(points: int):
    hits += 1
    combo += 1
    max_combo = max(max_combo, combo)
    score += points * combo
    score_changed.emit(score, combo)
    stats_changed.emit(hits, misses, level)

func register_miss():
    misses += 1
    combo = 1
    score_changed.emit(score, combo)
    stats_changed.emit(hits, misses, level)

func _end_run():
    set_process(false)
    var accuracy := 0
    if hits + misses > 0:
        accuracy = int(round(100.0 * hits / float(hits + misses)))
    game_over.emit(score, {
        "hits": hits, "misses": misses, "max_combo": max_combo,
        "level": level, "accuracy": accuracy,
    })

func restart():
    score = 0; combo = 1; max_combo = 1
    hits = 0; misses = 0; level = 1
    time_left = ROUND_LENGTH
    set_process(true)
    score_changed.emit(score, combo)
    stats_changed.emit(hits, misses, level)
    time_changed.emit(time_left, ROUND_LENGTH)
```

## Checklist

- [ ] Game built as its own scene (any root node type)
- [ ] Emits `game_over(final_score, stats)` when a run ends
- [ ] (Optional) emits `score_changed` / `stats_changed` / `time_changed` for the HUD
- [ ] (Optional) has a `restart()` method for Play Again
- [ ] `game_scene_path` points at your scene
- [ ] Ran it with **F5**, logged in, and the score reached the leaderboard

## Troubleshooting

| What you see | Fix |
|--------------|-----|
| Still see CheddaClick, not my game | Set **Game Scene Path** on the Game node in `scenes/Game.tscn` |
| "Offline — score not saved" | Not logged in — run the whole project with **F5** and log in at the menu |
| Game-over screen never appears | Your game never emits `game_over` — check the Output panel for `Game missing 'game_over' signal` |
| Errors mentioning CheddaBoards / "not found" | Autoloads aren't registered — re-run the Setup Wizard or add them under Project Settings → Autoload |
| Score saved but not on the board | Your Game ID doesn't match your dashboard |
| Blank screen in a web build | Serve it: `python3 -m http.server`, then the `localhost` URL — not `file://` |

Full list: [Errors](/api/errors).

**See also:** [Godot quick start](/quickstart/godot) (drop-in path) · [Signals reference](/engines/godot-signals) · [Achievements](/api/achievements) · [Anti-cheat](/concepts/anti-cheat) · [What's stored](/concepts/data-model)