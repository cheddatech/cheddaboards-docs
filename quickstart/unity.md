# Unity quick start

**Add leaderboards to a Unity game.** One C# file, no dependencies, works on every platform Unity builds to — desktop, mobile, WebGL, console, VR.

## Before you start

- **Unity 2022.3 LTS or newer** — the SDK is pure `UnityWebRequest`, no packages.
- **A CheddaBoards game** — register at [cheddaboards.com](https://cheddaboards.com/developers) for a Game ID and API key.

## Step 1 — Add the SDK

Copy `CheddaBoards.cs` from the [CheddaBoards-Unity repo](https://github.com/cheddatech/CheddaBoards-Unity) into your project, e.g. `Assets/Scripts/CheddaBoards.cs`. That's the whole install — the SDK auto-creates its own singleton `GameObject` with `DontDestroyOnLoad`, so there's no scene setup.

Prefer to start from a working example? The repo's [`Demo/`](https://github.com/cheddatech/CheddaBoards-Unity/tree/main/Demo) folder contains **CheddaClick**, a complete one-script game showing login, guest flow, play sessions, score submit, leaderboard render, and delta-synced achievements.

## Step 2 — Configure and log in

```csharp
using UnityEngine;
using System.Collections.Generic;   // for Dictionary when reading boards (Step 4)
using CheddaTech;   // the SDK lives in the CheddaTech namespace

public class Leaderboards : MonoBehaviour
{
    void Start()
    {
        var cb = CheddaBoards.Instance;   // auto-creates the singleton
        cb.SetApiKey("cb_my-game_xxxxxxxxx");
        cb.SetGameId("my-game");

        cb.OnLoginSuccess += (nickname) =>
            Debug.Log($"Welcome {(string.IsNullOrEmpty(nickname) ? "Guest" : nickname)}!");
        cb.OnScoreSubmitted += (score, streak) => Debug.Log($"Saved: {score}");

        cb.LoginAnonymous();   // no name — see below
    }
}
```

`LoginAnonymous` gets the player onto the board instantly with a persistent device ID — no account needed. It completes immediately: `OnLoginSuccess` fires during the call, so subscribe to events *before* calling it, as above. If no API key has been set, it fires `OnLoginFailed` instead. A brand-new player logged in without a name receives an empty string, so show "Guest" until they have one.

Log in **without** a name: returning players keep the nickname they already
saved, and brand-new players get a server-assigned name (`Player_1248`) when
their first submit creates the profile. `GetNickname()` returns `""`
until a profile fetch or rename has told the SDK the name — fetch the
profile after the first submit if you want to display or highlight it. Only pass a name to
`LoginAnonymous` when the player has just chosen it, because a passed name
becomes the current nickname and is written to the server on the next submit —
overwriting whatever they had. To let players pick or change their name, use
`ChangeNickname()` (see [Nicknames](#nicknames)).

## Step 3 — Submit a score

Call this from your own game-over logic, with the run's score and streak:

```csharp
void OnGameOver(int score, int streak)
{
    CheddaBoards.Instance.SubmitScore(score, streak);
}
```

`SubmitScore` fans out to every standard board on your game (all-time, weekly, daily). Only the player's best survives on each board.

## Step 4 — Read the leaderboard

```csharp
var cb = CheddaBoards.Instance;

cb.OnScoreboardLoaded += (id, config, entries) =>
{
    foreach (Dictionary<string, object> entry in entries)
        Debug.Log($"#{entry["rank"]} {entry["nickname"]}: {entry["score"]}");
};

cb.GetAlltimeLeaderboard();      // or GetWeeklyLeaderboard(), GetDailyLeaderboard()
cb.GetScoreboard("weekly", 100); // or any board by ID
```

Board reads come straight from the CheddaBoards canister for speed, with an automatic fallback to the proxy if the direct path can't get through — you don't have to do anything to get either.

## Step 5 — Anti-cheat play sessions (recommended)

Wrap each run in a play session so the backend can validate the score against elapsed time. Start when gameplay begins, end after submitting — the SDK attaches the active session token to your submit automatically.

```csharp
void StartRun()
{
    CheddaBoards.Instance.StartPlaySession();
    // …your game-start code…
}

void OnGameOver(int score, int streak)
{
    var cb = CheddaBoards.Instance;
    cb.SubmitScore(score, streak);   // session token attached automatically
    cb.EndPlaySession();
}
```

`StartPlaySession()` is asynchronous: the token arrives a moment later via `OnPlaySessionStarted` (or `OnPlaySessionError` if it fails). A submit sent before then goes without a token. That's only a risk for very short runs, but if your game can end within a second or two of starting, check `CheddaBoards.Instance.HasPlaySession()` before submitting, or wait for `OnPlaySessionStarted` before letting the run begin.

Set the actual limits (score caps, time validation) from your dashboard's Security tab — see [Anti-cheat](/concepts/anti-cheat). Without a session, scores still submit — unless the game has time validation enabled, in which case the session token is **required** and sessionless submits are rejected.

## Signing in with Google / Apple (optional)

Device Code Auth — the player authorises on their phone, no in-game browser popups, works on every platform:

```csharp
var cb = CheddaBoards.Instance;

cb.OnDeviceCodeReceived += (code, url, qrDataUrl) =>
{
    // Show the code + URL, or render qrDataUrl (a base64 PNG) as a scannable QR.
    codeLabel.text = $"Go to {url}\nEnter code: {code}";
};
cb.OnDeviceCodeApproved += (nickname) => Debug.Log($"Signed in as {nickname}");

cb.LoginWithDeviceCode();
```

Players sign in **once** — the session persists across restarts. If the server later rejects a stored session, `OnSessionExpired` fires (and `OnLogoutSuccess` with it, so a menu that handles logout falls back to its sign-in screen). Full flow: [Authentication](/api/authentication).

## Nicknames

Nicknames are **3–16 characters, letters, digits, and underscores**. A taken name is auto-suffixed (`Chedz` → `Chedz_1`) rather than rejected; only genuinely invalid names raise `OnNicknameError`, and that's permanent for that value — ask for a different one.

```csharp
cb.OnNicknameChanged += (newNick) => Debug.Log($"Now: {newNick}");
cb.ChangeNickname("NewName");
```

## Category & timed boards

Submit to one specific board (per-level, per-mode) with `SubmitScoreToBoard`, and run daily/weekly/monthly competitions with automatic archiving. Both work the same as elsewhere — the concepts are engine-agnostic:

```csharp
cb.SubmitScoreToBoard("level-14", score, streak);   // targeted board only, no fan-out
cb.GetLastWeekScoreboard();                          // read an archived period
```

See [Category boards](/concepts/category-boards) and [Timed leaderboards](/concepts/timed-leaderboards).

## Events reference

The events you'll connect to most:

| Event | Parameters |
|-------|-----------|
| `OnSdkReady` | — |
| `OnLoginSuccess` / `OnLoginFailed` | `nickname` / `error` |
| `OnLogoutSuccess` | — |
| `OnSessionExpired` | — (stored session rejected; `OnLogoutSuccess` also fires) |
| `OnScoreSubmitted` | `score, streak` |
| `OnScoreSubmittedToBoard` | `boardId, score, streak` |
| `OnScoreError` | `error` |
| `OnScoreboardLoaded` / `OnScoreboardError` | `id, config, entries` / `error` |
| `OnScoreboardRankLoaded` | `id, rank, score, streak, total` |
| `OnAchievementUnlocked` / `OnAchievementsLoaded` | `achievementId` / `achievements` |
| `OnPlaySessionStarted` / `OnPlaySessionError` | `token` / `error` |
| `OnDeviceCodeReceived` | `code, url, qrDataUrl` |
| `OnDeviceCodeApproved` / `OnDeviceCodeExpired` | `nickname` / — |
| `OnDeviceCodeError` | `error` |
| `OnAccountUpgraded` | `profile, migration` (`migratedGames` / `migratedScoreboards`) |
| `OnProfileLoaded` | `nickname, score, streak, achievements, playCount` |
| `OnNicknameChanged` / `OnNicknameError` | `nickname` / `error` |
| `OnArchivedScoreboardLoaded` | `archiveId, config, entries` |

Full method and event reference lives in the [SDK repo README](https://github.com/cheddatech/CheddaBoards-Unity).

## Common issues

| Issue | Fix |
|-------|-----|
| "Not authenticated" on submit | `LoginAnonymous()` wasn't called, or failed because no API key was set (check `OnLoginFailed`). With device code, wait for `OnDeviceCodeApproved` before submitting |
| Leaderboard fires twice | You subscribed to `OnScoreboardLoaded` inside a method that runs repeatedly — subscribe once, in `Start()` |
| Empty leaderboard | Confirm your Game ID matches the dashboard, and that the board ID exists. `OnScoreboardError` reports the reason |
| Score rejected | Start a play session before the run so the backend can time-validate it, and make sure it had started (`OnPlaySessionStarted`) before the submit. Check `OnScoreError` for the reason |
| WebGL build can't reach CheddaBoards | If the page hosting your build sets a Content-Security-Policy, add `https://api.cheddaboards.com` and `https://fdvph-sqaaa-aaaap-qqc4a-cai.raw.icp0.io` (direct board reads) to `connect-src` |

Full error reference: [Errors](/api/errors).

**See also:** [REST API](/quickstart/rest) · [Authentication](/api/authentication) · [Anti-cheat](/concepts/anti-cheat) · [What's stored](/concepts/data-model) · [Unity SDK repo](https://github.com/cheddatech/CheddaBoards-Unity)