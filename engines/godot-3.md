
# Godot 3.6

There's a community-supported backport of the CheddaBoards SDK for **Godot 3.6**, in a separate repo: [cheddaboards-godot3-addon](https://github.com/cheddatech/cheddaboards-godot3-addon).

It tracks **v2.2.5** of the Godot 4 SDK with identical signals, public methods, and response handling. Everything in the [Godot quick start](/quickstart/godot) and [Godot 4 guide](/engines/godot-4) applies — **only the GDScript syntax differs.** This page is just those differences.

::: info On Godot 4?
Use [cheddaboards-godot-addon](https://github.com/cheddatech/cheddaboards-godot-addon) (or the [full template](https://github.com/cheddatech/cheddaboards-godot)) — that's the primary, actively-developed SDK. New features land there first and may not be backported.
:::

## Install

Same as Godot 4: copy `addons/cheddaboards/CheddaBoards.gd` into your project (from the [3.x repo](https://github.com/cheddatech/cheddaboards-godot3-addon)), then add it in **Project Settings → AutoLoad** with the name `CheddaBoards`. Set your credentials:

```gdscript
CheddaBoards.set_api_key("cb_your-game_xxxxxxxxx")
CheddaBoards.set_game_id("your-game")
```

## The differences

### 1. `yield` instead of `await`

Godot 3.x has no `await`. Where the Godot 4 docs wait for the SDK, use `yield`:

```gdscript
# Godot 4
await CheddaBoards.wait_until_ready()

# Godot 3.6
yield(CheddaBoards, "sdk_ready")
```

### 2. `connect()` instead of typed signal callables

Godot 3.x connects signals with the string-and-target form, not 4.x's callable form:

```gdscript
# Godot 4
CheddaBoards.login_success.connect(_on_login)
CheddaBoards.leaderboard_loaded.connect(_on_leaderboard)

# Godot 3.6
CheddaBoards.connect("login_success", self, "_on_login")
CheddaBoards.connect("leaderboard_loaded", self, "_on_leaderboard")
```

The signal names and their arguments are identical to Godot 4 — see the [signals reference](/engines/godot-signals). Only the connect call changes.

### 3. `.instance()` instead of `.instantiate()`

If you instance a scene (e.g. a device-code login popup), Godot 3.x uses the older method name:

```gdscript
# Godot 4
var popup = preload("res://DeviceCodeLogin.tscn").instantiate()

# Godot 3.6
var popup = preload("res://DeviceCodeLogin.tscn").instance()
```

## A minimal example, 3.6 style

The Godot 4 drop-in, translated to 3.x syntax:

```gdscript
extends Control

func _ready():
    CheddaBoards.set_api_key("cb_my-game_xxxxxxxxx")
    CheddaBoards.set_game_id("my-game")

    CheddaBoards.connect("leaderboard_loaded", self, "_on_leaderboard")

    yield(CheddaBoards, "sdk_ready")
    CheddaBoards.login_anonymous("PlayerName")

func _on_game_over(score, streak):
    CheddaBoards.submit_score(score, streak)

func show_leaderboard():
    CheddaBoards.get_leaderboard("score", 100)

func _on_leaderboard(entries):
    for e in entries:
        print("#%d %s - %d" % [e.rank, e.nickname, e.score])
```

Everything else — submitting scores, play sessions, device-code sign-in, category boards, achievements — works exactly as documented for Godot 4, with the three syntax swaps above. Refer to the [Godot 4 guide](/engines/godot-4), the [signals reference](/engines/godot-signals), and the API pages; translate `await` → `yield`, `.connect(callable)` → `connect("name", self, "method")`, and `.instantiate()` → `.instance()` as you go.

## What's not backported

Because the 3.x SDK tracks v2.2.5, anything added to the Godot 4 SDK after that (see its [changelog](https://github.com/cheddatech/cheddaboards-godot-addon)) may not be present. Breaking bugs get fixed; new features land in the Godot 4 SDK first. If you need something that isn't there, a PR to the [3.x repo](https://github.com/cheddatech/cheddaboards-godot3-addon) is welcome.

**See also:** [Godot quick start](/quickstart/godot) · [Godot 4 guide](/engines/godot-4) · [Signals reference](/engines/godot-signals) · [3.x SDK repo](https://github.com/cheddatech/cheddaboards-godot3-addon)