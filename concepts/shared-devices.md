# Shared devices (player rosters)

Several players on one install: arcade cabinets, couch play, a classroom laptop, a demo machine at an event. This page is how to give each person their own name and their own row on the board.

Needs the Godot 4 addon or Unity SDK **2.3.1+**. It builds on [Player names](/concepts/player-names), so read that first.

## The idea

The answer is **not** to send a nickname with every score. The nickname is just a label on a profile; what makes someone a separate player is their **player ID**. On a normal install the SDK generates one `dev_…` ID per device and reuses it, so one device is one player. Sending a different nickname each time would rename that single profile back and forth, and everyone would share one row that only ever moves up.

Instead, keep a small roster in the game: one player ID per person, generated once and saved locally, and make the chosen person's ID the active one before they play. Each ID is a separate profile with its own name, bests and board rows, exactly as if they were on separate devices.

Four steps for switching (SDK **2.3.1+**, where `set_player_id()` resets the previous person's cached profile, name, pending rename and play session when the ID changes):

1. **Call `logout()` / `Logout()`** first. `set_player_id()` does not drop a signed-in session or a link code that is still waiting for approval; `logout()` does. If nobody on the device ever links an account this is a no-op, so always call it. It emits `logout_success` / `OnLogoutSuccess`: if your game sends that signal to a login screen, ignore it during a switch.
2. **Set the ID**, then **`login_anonymous()` / `LoginAnonymous()`** with no name.
3. **Fetch the profile with `get_player_profile()` / `GetPlayerProfile()`**, not `refresh_profile()`: the refresh helper has a 2-second cooldown and silently does nothing inside it, which a quick switch can hit.
4. **Start a new play session** when the new person's run begins. Sessions are per player.

The SDKs don't persist a `set_player_id()` override, so re-apply it from your roster on startup too.

::: warning On 2.3.0
2.3.0 did not fully reset the previous person's state on a switch, so a new person's `change_nickname()` before their first score was sent to the server and lost. Update to 2.3.1. If you must stay on 2.3.0, follow the same four steps, but give a new person their name at creation with `login_anonymous(name)` instead of `change_nickname()`.
:::

Name entry per person is the normal flow from [Player names](/concepts/player-names): offer the box when `get_nickname()` is `""` after the profile is known, rename through the SDK, never pass names into login.

## Linking on a shared device

Linking uses up the slot. When someone links, their anonymous profile is merged into their account and its `dev_…` ID stops existing on the server. Selecting that slot again would start a brand-new empty player under the old ID, so remove the slot from your roster when `account_upgraded` / `OnAccountUpgraded` fires. The person's scores are safe on their account, and they stay signed in until the next switch; to play as that account on this device again later, they link again.

A signed-in session belongs to one person, which is why every switch starts with `logout()`. Without it the next person's scores and renames go to the linked account, whatever player ID is set.

If that's more than your game needs, the simple option is to not offer linking on shared installs at all.

## Roster: Godot 4

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
	# 128 random bits from the OS. The ID is the player's only credential,
	# so it must not be guessable (randi() and timestamps are).
	var id := "dev_" + Crypto.new().generate_random_bytes(16).hex_encode()
	players.append({ "id": id, "label": label })
	_save()
	return players.size() - 1

func select(index: int) -> void:
	active = index
	_save()
	CheddaBoards.logout()                 # drops a signed-in session or pending link code from the previous person
	CheddaBoards.set_player_id(players[index]["id"])   # 2.3.1+: resets the previous person's state
	CheddaBoards.login_anonymous()        # no name
	CheddaBoards.get_player_profile()     # no cooldown; profile_loaded / no_profile then drives name entry

func _save() -> void:
	var cfg := ConfigFile.new()
	cfg.set_value("roster", "players", players)
	cfg.set_value("roster", "active", active)
	cfg.save(PATH)
```

On startup: if `active >= 0`, call `Roster.select(active)` before anything else touches CheddaBoards. When a run starts for the selected person, `start_play_session()` as usual.

## Roster: Unity

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
        // 128 random bits from the OS. The ID is the player's only credential,
        // so it must not be guessable (UnityEngine.Random and timestamps are).
        var bytes = new byte[16];
        using (var rng = System.Security.Cryptography.RandomNumberGenerator.Create()) rng.GetBytes(bytes);
        string id = "dev_" + System.BitConverter.ToString(bytes).Replace("-", "").ToLowerInvariant();
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
        cb.Logout();             // drops a signed-in session or pending link code from the previous person
        cb.SetPlayerId(store.players[index].id);   // 2.3.1+: resets the previous person's state
        cb.LoginAnonymous();     // no name
        cb.GetPlayerProfile();   // no cooldown; OnProfileLoaded / OnNoProfile then drives name entry
    }

    public static int Active { get { Load(); return store.active; } }
    public static IReadOnlyList<string> Labels { get { Load(); return store.players.ConvertAll(p => p.label); } }
}
```

On startup: if `Roster.Active >= 0`, call `Roster.Select(Roster.Active)` before anything else touches CheddaBoards. Start a play session per run as usual.

## REST

Nothing special: `playerId` on every request is whatever you send. Generate one `dev_` ID per person from a cryptographic random source (at least 128 bits), store them, and send the selected one. Include `nickname` only on that person's first submit (or use the rename endpoint); see [Players](/api/players#change-a-nickname).

## Things that cause confusion

| Symptom | Cause | Fix |
|---|---|---|
| Several people share one device and keep overwriting each other | One device ID, so they are one profile; sending names per submit just renames it | One player ID per person, switched before they play |
| On a shared device, the next person shows up with the previous person's name, or their scores land on someone else's row | The previous person linked an account and the switch didn't call `logout()`, so their session is still active | Call `logout()` before `set_player_id()` on every switch; see [Linking on a shared device](#linking-on-a-shared-device) |
| On a shared device, a linked person's slot comes back empty | Linking merged that slot into their account; the old ID no longer exists | Remove the slot on `account_upgraded`; they link again to play as their account |

**See also:** [Player names](/concepts/player-names) · [Players and accounts](/concepts/accounts)
