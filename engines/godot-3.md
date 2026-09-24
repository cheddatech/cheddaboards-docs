# Godot 3.6

There's a community-supported backport of the CheddaBoards SDK for **Godot 3.6**, in a separate repo: [cheddaboards-godot3-addon](https://github.com/cheddatech/cheddaboards-godot3-addon).

It tracks **v2.2.5** of the Godot 4 SDK with the same signals, public methods, and response handling. The [Godot quick start](/quickstart/godot) applies — **only the GDScript syntax differs**, plus a few fixes that haven't been backported yet (see [Known differences from 2.2.7](#known-differences-from-2-2-7)). This page covers both.

::: info On Godot 4?
Use [cheddaboards-godot-addon](https://github.com/cheddatech/cheddaboards-godot-addon) (or the [full template](https://github.com/cheddatech/cheddaboards-godot)) — that's the primary, actively-developed SDK. New features land there first and may not be backported.
:::

::: warning No template for 3.6
The [Godot 4 guide](/engines/godot-4) is about the template — its menus, game wrapper and `Achievements` autoload — and the template is **Godot 4 only**. On 3.6 you're on the drop-in path: the SDK plus your own UI.
:::

## Install

Copy `addons/cheddaboards/CheddaBoards.gd` into your project (from the [3.x repo](https://github.com/cheddatech/cheddaboards-godot3-addon)), then add it in **Project Settings → AutoLoad** with the name `CheddaBoards`. Set your credentials:

```gdscript
CheddaBoards.set_api_key("cb_your-game_xxxxxxxxx")
CheddaBoards.set_game_id("your-game")
```

## The differences

### 1. `yield` instead of `await`

Godot 3.x has no `await`. Where the Godot 4 docs wait for the SDK, use `yield` — guarded, because `yield` waits for the *next* `sdk_ready`, and if the SDK is already ready it would wait forever:

```gdscript
# Godot 4
await CheddaBoards.wait_until_ready()

# Godot 3.6
if not CheddaBoards.is_ready():
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

If you instance a scene (e.g. your own device-code login popup), Godot 3.x uses the older method name:

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

    if not CheddaBoards.is_ready():
        yield(CheddaBoards, "sdk_ready")
    CheddaBoards.login_anonymous()   # no name: returning players keep theirs

func _on_game_over(score, streak):
    CheddaBoards.submit_score(score, streak)

func show_leaderboard():
    CheddaBoards.get_leaderboard("score", 100)

func _on_leaderboard(entries):
    for e in entries:
        print("#%d %s - %d" % [e.rank, e.nickname, e.score])
```

Log in **without** a name, exactly as on Godot 4: a name passed to `login_anonymous()` becomes the player's nickname and is written on the next submit. Brand-new players get a server-assigned name (`Player_1248`) on their first submit; to let players choose, use `change_nickname()`.

Submitting scores, play sessions, device-code sign-in and category boards work as documented in the [Godot quick start](/quickstart/godot) — translate `await` → `yield`, `.connect(callable)` → `connect("name", self, "method")`, and `.instantiate()` → `.instance()` as you go. Achievements use the SDK's own calls (`submit_score_with_achievements`, `unlock_achievement`), since the `Achievements` autoload is part of the Godot 4 template.

## Known differences from 2.2.7

The Godot 4 SDK fixed three bugs in 2.2.7 that are still present in the 3.x SDK:

- **A submit can overwrite a returning player's name.** 2.2.5 always sends a nickname with each submit, generating a `Player_XXXXXX` fallback when it doesn't know the name yet. If a returning anonymous player submits before their profile has loaded, their saved name is replaced. Workaround: after login, call `refresh_profile()` and wait for `profile_loaded` (or `no_profile` for a brand-new player) before the first submit.
- **`get_achievements()` calls a route that doesn't exist** and fails with `Unknown endpoint`. Read achievements from the `profile_loaded` signal instead (its 4th argument).
- **Batch achievement syncs can report "0 synced"** even though the server stored them. Don't rely on the reported count; the unlocks are saved.

## What's not backported

Because the 3.x SDK tracks v2.2.5, anything added to the Godot 4 SDK after that (see its [changelog](https://github.com/cheddatech/cheddaboards-godot-addon)) may not be present. Breaking bugs get fixed; new features land in the Godot 4 SDK first. If you need something that isn't there, a PR to the [3.x repo](https://github.com/cheddatech/cheddaboards-godot3-addon) is welcome.

**See also:** [Godot quick start](/quickstart/godot) · [Signals reference](/engines/godot-signals) · [3.x SDK repo](https://github.com/cheddatech/cheddaboards-godot3-addon)