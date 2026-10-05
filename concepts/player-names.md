# Player names

How nicknames work, the three rules that keep them from going wrong, and copy-paste name-entry flows for Godot and Unity.

Applies to the Godot 4 addon **2.2.7+** and the Unity SDK **2.3.0+**. Older versions had a bug where a submit could overwrite a saved name with a generated one; if names are "changing on their own", update the SDK first. The Godot 3.6 backport (2.2.5-3x) still has that bug: on 3.6, call `refresh_profile()` after login and wait for `profile_loaded` or `no_profile` before the first submit (see the [3.6 guide](/engines/godot-3#known-differences-from-2-2-7)). Everything else on this page applies to 3.6 as written.

## The one thing to understand

**A player's name lives on the server, not in your game.** It's attached to their profile (an anonymous device ID, or a linked account) and it's the same across every game on CheddaBoards. The SDK keeps a local copy and only writes to the server when:

1. the player's **first score submit** creates their profile (the server assigns a name like `Player_1248` if none was chosen),
2. you call **`change_nickname()` / `ChangeNickname()`**, or
3. the player **links an account** and that account is brand new (it's created with the in-game name they chose).

Nothing else writes a name. In particular, **submitting a score does not rename anyone**, and **logging in does not rename anyone** unless you pass a name into the login call, which is the mistake almost everyone makes.

## Three rules

### 1. Log in with no name

```gdscript
CheddaBoards.login_anonymous()        # right
CheddaBoards.login_anonymous("Alex")  # wrong, unless Alex just typed it in
```

```csharp
cb.LoginAnonymous();        // right
cb.LoginAnonymous("Alex");  // wrong, unless Alex just typed it in
```

Any name you pass becomes the current nickname and is sent with the next submit. For an existing player that means: if the name is free, they are **silently renamed**; if it's taken, nothing happens and they keep their old name, with no error either way. Passing a name every launch (a saved name, a default, a random one) is how players end up renamed, how a returning player's `Chicken` becomes `Player_1248`, and how a leaderboard fills with one player under five names.

Leave it empty. Returning players keep their stored name automatically. Brand-new players get a server-assigned name on their first submit, unless they pick one first (rule 3).

### 2. Treat `""` as "Guest"

Until the profile loads, and for a new player who hasn't picked a name, `get_nickname()` / `GetNickname()` returns `""`. Show "Guest" in your UI. Don't fill the gap with a name of your own; see rule 1.

### 3. Rename through the SDK, and listen for the answer

```gdscript
CheddaBoards.change_nickname("Alex")
```

```csharp
cb.ChangeNickname("Alex");
```

Then wait for one of two signals:

- **`nickname_changed(name)` / `OnNicknameChanged`**: accepted. Use the `name` the signal gives you, not the input box.
- **`nickname_error(reason)` / `OnNicknameError`**: rejected. **The rejection is permanent for that value**; retrying the same string will fail the same way. Show the reason and let the player type something else.

Name rules (pre-checked by the SDK, enforced by the server): **3 to 16 characters, letters, numbers and underscores only.** Spaces, emoji and punctuation are rejected.

There's a wrinkle for **brand-new players**. Until their first score creates a profile, they don't exist on the server, so `change_nickname()` only stores the name locally and fires `nickname_changed` straight away with exactly what was typed. The server first sees it on their first submit. If the name is free, the profile is created with it. If `Alex` is already taken, the profile is created as `Player_N` instead (no suffixing on this path), and that name arrives on the next `profile_loaded` / `OnProfileLoaded` with no `nickname_changed` for it. For players who already have a profile, the rename goes to the server immediately and the signal carries the final name: `Alex`, or `Alex_1` if `Alex` was taken.

If you want new players to get the suffixed version rather than `Player_N`, call `change_nickname()` again once `profile_loaded` fires after their first score. The rename path suffixes; the create path doesn't.

The practical rule covering both: **after `profile_loaded`, redraw the name from `get_nickname()`.** Treat it as the source of truth whenever it fires.

## Name-entry flow: Godot 4

Drop this on a Control with a `LineEdit` named `NameInput`, a `Button` named `ConfirmButton`, and a `Label` named `StatusLabel`. It shows the box only when the player has no name yet.

```gdscript
extends Control

@onready var name_input: LineEdit = $NameInput
@onready var confirm_button: Button = $ConfirmButton
@onready var status_label: Label = $StatusLabel

func _ready() -> void:
	visible = false
	confirm_button.pressed.connect(_on_confirm)
	name_input.text_submitted.connect(func(_t): _on_confirm())

	CheddaBoards.profile_loaded.connect(_on_profile_known)
	CheddaBoards.no_profile.connect(_on_profile_known)
	CheddaBoards.nickname_changed.connect(_on_nickname_changed)
	CheddaBoards.nickname_error.connect(_on_nickname_error)

	# Log in with NO name. Returning players keep theirs.
	CheddaBoards.login_anonymous()
	CheddaBoards.refresh_profile()

# Fires once we know whether the player already has a name (profile_loaded
# passes arguments, no_profile passes none; we ignore both).
func _on_profile_known(_a = null, _b = null, _c = null, _d = null, _e = null) -> void:
	if CheddaBoards.get_nickname() == "":
		visible = true          # new player: ask for a name
		name_input.grab_focus()
	else:
		visible = false         # returning player: nothing to do

func _on_confirm() -> void:
	var wanted := name_input.text.strip_edges()
	status_label.text = "Checking..."
	confirm_button.disabled = true
	CheddaBoards.change_nickname(wanted)   # SDK validates 3-16 / [A-Za-z0-9_] first

func _on_nickname_changed(final_name: String) -> void:
	# Use final_name, not name_input.text. For a new player this is what they
	# typed (stored locally until their first score); if it turns out to be
	# taken, the suffixed name arrives on the next profile_loaded, so always
	# redraw name displays from get_nickname() there.
	status_label.text = "Welcome, %s!" % final_name
	confirm_button.disabled = false
	visible = false

func _on_nickname_error(reason: String) -> void:
	# Permanent for this value. Don't auto-retry; let them type another.
	status_label.text = reason
	confirm_button.disabled = false
	name_input.grab_focus()
```

Anywhere else in the game, display the name like this:

```gdscript
var shown := CheddaBoards.get_nickname()
if shown == "":
	shown = "Guest"
```

**Godot 3.6**: same API and signals; connect with `CheddaBoards.connect("nickname_changed", self, "_on_nickname_changed")` and so on.

## Name-entry flow: Unity

Same shape. Attach to a panel with a `TMP_InputField`, a `Button` and a `TMP_Text`. The panel appears only for players with no name.

```csharp
using CheddaTech;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class NameEntry : MonoBehaviour
{
    public GameObject panel;
    public TMP_InputField nameInput;
    public Button confirmButton;
    public TMP_Text statusLabel;

    private CheddaBoards cb;

    void Start()
    {
        cb = CheddaBoards.Instance;
        panel.SetActive(false);
        confirmButton.onClick.AddListener(OnConfirm);
        nameInput.onSubmit.AddListener(_ => OnConfirm());

        cb.OnProfileLoaded += (nick, score, streak, ach, plays) => OnProfileKnown();
        cb.OnNoProfile += OnProfileKnown;
        cb.OnNicknameChanged += OnNicknameChanged;
        cb.OnNicknameError += OnNicknameError;

        // Log in with NO name. Returning players keep theirs.
        cb.LoginAnonymous();
        cb.RefreshProfile();
    }

    void OnProfileKnown()
    {
        bool needsName = string.IsNullOrEmpty(cb.GetNickname());
        panel.SetActive(needsName);
        if (needsName) nameInput.ActivateInputField();
    }

    void OnConfirm()
    {
        string wanted = nameInput.text.Trim();
        statusLabel.text = "Checking...";
        confirmButton.interactable = false;
        cb.ChangeNickname(wanted);   // SDK validates 3-16 / [A-Za-z0-9_] first
    }

    void OnNicknameChanged(string finalName)
    {
        // Use finalName, not nameInput.text. For a new player this is what they
        // typed (stored locally until their first score); if it turns out to be
        // taken, the suffixed name arrives on the next OnProfileLoaded, so
        // always redraw name displays from GetNickname() there.
        statusLabel.text = $"Welcome, {finalName}!";
        confirmButton.interactable = true;
        panel.SetActive(false);
    }

    void OnNicknameError(string reason)
    {
        // Permanent for this value. Don't auto-retry; let them type another.
        statusLabel.text = reason;
        confirmButton.interactable = true;
        nameInput.ActivateInputField();
    }
}
```

Display helper:

```csharp
string shown = string.IsNullOrEmpty(cb.GetNickname()) ? "Guest" : cb.GetNickname();
```

## What happens when a player signs in (links an account)

When a player links via the device-code flow, their anonymous progress merges into the account. Names follow the account:

- **New account** (first time this Google/Apple user has linked anywhere): the account is created with the name the player chose in your game. Nothing changes from their point of view.
- **Existing account** (they've linked before, in your game or another): the account's name wins. Your local copy is replaced. This is correct: it's the same person, and their name is the same across every game.

So after `device_code_approved` / `OnDeviceCodeApproved` and `account_upgraded` / `OnAccountUpgraded`, read `get_nickname()` again and redraw. Don't push your old local name back with `change_nickname()`; you'd be renaming them across all their games.

## Shared devices: several players, one install

Arcade cabinets, couch play, a classroom laptop, a demo machine at an event. Several people take turns on one install and each wants their own name and their own row on the board.

The answer is **not** to send a nickname with every score. The nickname is just a label on a profile; what makes someone a separate player is their **player ID**. On a normal install the SDK generates one `dev_…` ID per device and reuses it, so one device is one player. Sending a different nickname each time would rename that single profile back and forth, and everyone would share one row that only ever moves up.

Instead, keep a small roster in the game: one player ID per person, generated once and saved locally, and make the chosen person's ID the active one before they play. Each ID is a separate profile with its own name, bests and board rows, exactly as if they were on separate devices. Linking still works per person: whoever links merges their own slot into their account.

Three rules for switching:

1. **Set the ID, then log in again.** `login_anonymous()` / `LoginAnonymous()` (no name) clears the cached name so the previous person's isn't shown for the next.
2. **Refresh the profile** so `get_nickname()` and the bests are the new person's.
3. **Start a new play session** for the new person. Sessions are per player.

The SDKs don't persist a `set_player_id()` override, so re-apply it from your roster on startup too. Name entry per person is the normal flow from above: offer the box when `get_nickname()` is `""` after the profile is known, rename through the SDK, never pass names into login.

### Roster: Godot 4

```gdscript
# Roster.gd (autoload). One dev_ ID per local player, saved in user://.
extends Node

const PATH := "user://roster.cfg"
var players: Array = []       # [{ "id": "dev_...", "label": "Player 1" }, ...]
var active := -1

func _ready() -> void:
	var cfg := ConfigFile.new()
	if cfg.load(PATH) == OK:
		players = cfg.get_value("roster", "players", [])
		active = cfg.get_value("roster", "active", -1)

func add_player(label: String) -> int:
	# Same shape the SDK uses for its own device ID.
	var ts := str(Time.get_unix_time_from_system()).replace(".", "")
	var id := "dev_%s_%08x" % [ts, randi() & 0x7FFFFFFF]
	players.append({ "id": id, "label": label })
	_save()
	return players.size() - 1

func select(index: int) -> void:
	active = index
	_save()
	CheddaBoards.set_player_id(players[index]["id"])
	CheddaBoards.login_anonymous()        # no name: clears the previous person's cached name
	CheddaBoards.refresh_profile()        # profile_loaded / no_profile then drives name entry

func _save() -> void:
	var cfg := ConfigFile.new()
	cfg.set_value("roster", "players", players)
	cfg.set_value("roster", "active", active)
	cfg.save(PATH)
```

On startup: if `active >= 0`, call `Roster.select(active)` before anything else touches CheddaBoards. When a run starts for the selected person, `start_play_session()` as usual.

### Roster: Unity

```csharp
using System.Collections.Generic;
using UnityEngine;
using CheddaTech;

// One dev_ ID per local player, saved in PlayerPrefs.
public static class Roster
{
    [System.Serializable] class Entry { public string id; public string label; }
    [System.Serializable] class Store { public List<Entry> players = new List<Entry>(); public int active = -1; }

    const string KEY = "cb_roster";
    static Store store;

    static void Load()
    {
        if (store != null) return;
        store = PlayerPrefs.HasKey(KEY) ? JsonUtility.FromJson<Store>(PlayerPrefs.GetString(KEY)) : new Store();
    }

    static void Save() { PlayerPrefs.SetString(KEY, JsonUtility.ToJson(store)); PlayerPrefs.Save(); }

    public static int Add(string label)
    {
        Load();
        // Same shape the SDK uses for its own device ID.
        string id = $"dev_{System.DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}_{Random.Range(0, int.MaxValue):x8}";
        store.players.Add(new Entry { id = id, label = label });
        Save();
        return store.players.Count - 1;
    }

    public static void Select(int index)
    {
        Load();
        store.active = index;
        Save();
        var cb = CheddaBoards.Instance;
        cb.SetPlayerId(store.players[index].id);
        cb.LoginAnonymous();     // no name: clears the previous person's cached name
        cb.RefreshProfile();     // OnProfileLoaded / OnNoProfile then drives name entry
    }

    public static int Active { get { Load(); return store.active; } }
    public static IReadOnlyList<string> Labels { get { Load(); return store.players.ConvertAll(p => p.label); } }
}
```

On startup: if `Roster.Active >= 0`, call `Roster.Select(Roster.Active)` before anything else touches CheddaBoards. Start a play session per run as usual.

### REST

Nothing special: `playerId` on every request is whatever you send. Generate one `dev_<unixtime>_<random>` per person, store them, and send the selected one. Include `nickname` only on that person's first submit (or use the rename endpoint); see [Players](/api/players#change-a-nickname).

## Things that cause confusion

| Symptom | Cause | Fix |
|---|---|---|
| Returning player's name reverts to `Player_1248` | A name is passed into `login_anonymous()` / `LoginAnonymous()` on every launch, or the SDK is older than 2.2.7 | Log in with no name; update the SDK |
| Leaderboard shows the same player under several names | Game generates or stores its own name and passes it at login | Same as above; the server is the source of truth, not your save file |
| `change_nickname` keeps failing with the same message | The value is invalid or taken-and-unsuffixable; rejections are permanent per value | Show the reason, let the player type a different one, never auto-retry |
| Existing player typed `Alex`, UI shows `Alex` but board shows `Alex_1` | `Alex` was taken; the rename was suffixed | Redraw name displays from `get_nickname()` on every `profile_loaded` |
| New player typed `Alex`, board shows `Player_1248` | `Alex` was taken when their first score created the profile; the create path falls back to a generated name rather than suffixing | Call `change_nickname()` again after `profile_loaded` to get `Alex_1`, or check availability first |
| Passed a name at login, nothing changed | The name was already taken, so the submit kept the old one; no error is raised on this path | Don't pass names at login; use `change_nickname()`, which reports the outcome |
| Name chosen right after launch is gone a moment later | The name was set while the profile fetch was still in flight; when the profile landed it overwrote the local name | Don't offer the name box until `profile_loaded` or `no_profile` has fired (the flows above do this) |
| After signing in, the name changed to something else | Player linked an existing account; the account's name wins | Expected. Redraw from `get_nickname()` after `account_upgraded` |
| New player shows `""` / blank | Profile hasn't loaded yet, or they haven't picked a name | Show "Guest" |
| Several people share one device and keep overwriting each other | One device ID, so they are one profile; sending names per submit just renames it | One player ID per person, switched before they play; see [Shared devices](#shared-devices-several-players-one-install) |

## Reference

| | Godot | Unity |
|---|---|---|
| Log in (no name) | `login_anonymous()` | `LoginAnonymous()` |
| Current name (`""` = unnamed) | `get_nickname()` | `GetNickname()` |
| Rename | `change_nickname(name)` | `ChangeNickname(name)` |
| Accepted | `nickname_changed(name)` | `OnNicknameChanged(name)` |
| Rejected (permanent per value) | `nickname_error(reason)` | `OnNicknameError(reason)` |
| Profile known | `profile_loaded(...)` / `no_profile()` | `OnProfileLoaded(...)` / `OnNoProfile` |

Name rule: 3 to 16 characters, `A-Z a-z 0-9 _`. Renames to a taken name are suffixed (`Alex_1`). Players who never pick a name, or whose chosen name is taken at the moment their first score creates the profile, get `Player_N`. A name chosen before the first submit is held locally and sent with that submit. Changing a name changes it on every board and in every game the player has played.
