# Display names (any language)

Let players show a name in their own language, like `田中 太郎`, `김민준`, `Дмитрий` or `Ana María`, alongside their nickname.

Needs the Godot 4 addon **2.5.0+** or the REST API. Unity support is coming in the Unity SDK 2.5.0; until then Unity games can call the REST endpoints below.

## Nickname vs display name

Every player keeps their **nickname**. It is unchanged: unique, 3–16 characters, `A–Z a–z 0–9 _` only, and it's the name every game can render (see [Player names](/concepts/player-names)).

A **display name** is a second, optional name:

| | Nickname | Display name |
|---|---|---|
| Required | Yes (server assigns `Player_N` if none) | No |
| Unique | Yes (taken names get `_1`) | No, two players can both be `田中` |
| Characters | ASCII letters, digits, `_` | Letters and marks in any script, digits, `_ - ・`, one space |
| Length | 3–16 characters | 2–16 characters (as people count them), at most 48 bytes |
| Where it shows | Every game | Only games with **International names** on |
| How many | One per player | One per player, shared across those games |

When a board entry has a display name, show it. Keep the nickname somewhere nearby (smaller, or on tap): display names aren't unique, so it's how two `田中`s are told apart.

## Turn it on for your game

In the [dashboard](https://cheddaboards.com/developers), open your game's **Edit** form and tick **International names**. It's off by default, and while it's off nothing changes for your game: players can't set a display name from it, and your boards and profiles don't include one.

Only turn it on once your game can render the characters (see [Fonts](#fonts)), or players will see boxes instead of their name.

## Rules

The API checks and normalises every display name. Always show the name it sends back, not what the player typed.

- **Normalised first.** Full-width letters become normal ones (`ｔａｎａｋａ` → `tanaka`), an ideographic space becomes a normal space, spaces at the ends are trimmed, and runs of spaces collapse to one.
- **2–16 characters**, counted the way people see them (an accented letter or a Korean syllable is one), and at most 48 bytes of UTF-8.
- **Letters, marks and digits** from any script, plus `_`, `-`, `・` and **at most one space**. At least one letter.
- **One alphabet per name.** `Дмитрий` and `Dmitry` are fine, `Дmitry` isn't. Japanese, Chinese and Korean mixes are allowed (`Tanaka太郎`, `たなか太郎`), as is Latin alongside them.
- **No emoji**, invisible characters, or text-direction tricks.
- **At most 20 changes per player per hour.**

Rejections come back as a normal 400 with a readable reason, for example `Display names can't mix alphabets (Japanese, Chinese and Korean mixes are fine)`. Show the reason and let the player try something else.

## Godot 4

```gdscript
func _ready() -> void:
	CheddaBoards.game_info_loaded.connect(_on_game_info)
	CheddaBoards.display_name_changed.connect(_on_display_name_changed)
	CheddaBoards.display_name_error.connect(_on_display_name_error)
	CheddaBoards.get_game_info()   # sets CheddaBoards.international_names

func _on_game_info(_info: Dictionary) -> void:
	$DisplayNameInput.visible = CheddaBoards.international_names
	$DisplayNameInput.text = CheddaBoards.get_display_name()

func _on_save_pressed() -> void:
	CheddaBoards.set_display_name($DisplayNameInput.text)   # "" clears it

func _on_display_name_changed(display_name: String) -> void:
	$DisplayNameInput.text = display_name   # the normalised name; "" = cleared

func _on_display_name_error(reason: String) -> void:
	$StatusLabel.text = reason
```

Leaderboard rows: `get_entry_name(entry)` returns the entry's display name when it has one and its nickname otherwise.

```gdscript
func _on_scoreboard_loaded(_id: String, _config: Dictionary, entries: Array) -> void:
	for entry in entries:
		var row_name := CheddaBoards.get_entry_name(entry)
		var nickname := str(entry.get("nickname", ""))
		# show row_name, and nickname small beside it when they differ
```

Also available: `clear_display_name()`, and `get_display_name()` for the player's own name. The [game template](https://github.com/cheddatech/cheddaboards-godot) (MainMenu 2.1.11, Leaderboard 2.2.0) does all of this already: an optional field under the name box that only appears when the setting is on, and display names on leaderboard rows.

### Players who haven't scored yet

You can call `set_display_name()` before the player's first score. The API holds the name and applies it with their first submit, and `display_name_changed` fires straight away with the normalised name.

## Fonts

Godot's and Unity's default fonts have **no Japanese, Chinese or Korean characters**. Check each export target you ship before turning the setting on.

### Godot 4

On desktop and mobile, Godot can often fall back to a system font for missing characters. **Web exports have no system fonts**, so they always need one bundled. The dependable fix is to bundle a CJK font and use it as a fallback:

1. Download a font that covers the scripts you expect, for example [Noto Sans JP](https://fonts.google.com/noto/specimen/Noto+Sans+JP) (Japanese), Noto Sans SC (Chinese) or Noto Sans KR (Korean), and copy the `.ttf` or `.otf` into your project, for example `res://fonts/`.
2. **If your game uses its own font:** select that font file in the FileSystem dock and add the CJK font to its **Fallbacks** list, in the Import dock's advanced settings, or in the Inspector on a `FontVariation` or theme font.
3. **If you use Godot's default font:** put this in your first scene (or an autoload) so every control falls back to the CJK font:

```gdscript
func _ready() -> void:
	var cjk: FontFile = load("res://fonts/NotoSansJP-Regular.ttf")
	var font := FontVariation.new()
	font.base_font = ThemeDB.fallback_font
	font.fallbacks = [cjk]
	var theme := Theme.new()
	theme.default_font = font
	get_tree().root.theme = theme
```

CJK fonts are large (several MB per script). If size matters, ship only the scripts your players use.

### Unity

With TextMesh Pro, create a **dynamic** font asset from a Noto Sans CJK font (Window → TextMeshPro → Font Asset Creator, or right-click the font → Create → TextMeshPro → Font Asset, then set Atlas Population Mode to Dynamic). Then add it to **Project Settings → TextMesh Pro → Settings → Fallback Font Assets**, or to your main font asset's fallback list.

## REST

Set or clear a display name:

```
PUT /players/{playerId}/display-name     # anonymous — X-API-Key, body: { "displayName": "..." }
PUT /profile/display-name                # signed-in — X-Session-Token, body: { "displayName": "..." }
```

Send `null` or `""` to clear it.

```bash
curl -X PUT "https://api.cheddaboards.com/players/dev_1730000000_1a2b3c4d/display-name" \
  -H "X-API-Key: cb_my-game_xxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"田中　太郎"}'
```

```json
{"ok":true,"data":{"displayName":"田中 太郎","nickname":"Tanaka"}}
```

For a player who hasn't scored yet, the name is held for up to 24 hours and applied with their first submit:

```json
{"ok":true,"data":{"displayName":"田中 太郎","nickname":null,"pending":true,"message":"Display name saved. It will appear on the leaderboard with your first score."}}
```

Reading it back, in games with the setting on:

- **Board entries** (`GET /games/{gameId}/scoreboards/{id}`, archives, and the direct canister read) include `"displayName"` on entries that have one. Entries without one, and every entry in games with the setting off, look exactly as before.
- **Profiles** (`GET /players/{playerId}/profile`, `GET /auth/profile`) include `"displayName"` (`null` when the player has none).
- **`GET /game`** includes `"internationalNames": true|false`.

Errors are 400s with the reason in `error`. With the setting off you get `International names are not enabled for this game. The developer can turn them on in the dashboard.` Too many changes returns 429 with `Retry-After`.

## Moderation

In the dashboard's board view, a player with a display name shows it under their nickname, with a **reset name** button. Resetting clears that player's display name (there's one per player, so it's cleared in every game), leaves their scores alone, and is recorded in the deletion log. The player can set a new one.

**See also:** [Player names](/concepts/player-names) · [Players API](/api/players) · [Moderation](/concepts/moderation)
