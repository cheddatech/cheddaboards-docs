# Unity quick start

**Add leaderboards to a Unity game.** One C# file, no dependencies, works on every platform Unity builds to — desktop, mobile, WebGL, console, VR.

## Before you start

- **Unity** (any recent version — the SDK is pure `UnityWebRequest`, no packages).
- **A CheddaBoards game** — register at [cheddaboards.com](https://cheddaboards.com/developers) for a Game ID and API key.

## Step 1 — Add the SDK

Copy `CheddaBoards.cs` from the [CheddaBoards-Unity repo](https://github.com/cheddatech/CheddaBoards-Unity) into your project, e.g. `Assets/Scripts/CheddaBoards.cs`. That's the whole install — the SDK auto-creates its own singleton `GameObject` with `DontDestroyOnLoad`, so there's no scene setup.

## Step 2 — Configure and log in

```csharp
using UnityEngine;

public class Leaderboards : MonoBehaviour
{
    void Start()
    {
        var cb = CheddaBoards.Instance;   // auto-creates the singleton
        cb.SetApiKey("cb_my-game_xxxxxxxxx");
        cb.SetGameId("my-game");

        cb.OnLoginSuccess += (nickname) => Debug.Log($"Welcome {nickname}!");
        cb.OnScoreSubmitted += (score, streak) => Debug.Log($"Saved: {score}");

        cb.LoginAnonymous("PlayerName");
    }
}
```

`LoginAnonymous` gets the player onto the board instantly with a persistent device ID — no account needed. Submitting a score before login completes fails, so submit from your game-over code, not before `OnLoginSuccess`.

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

Set the actual limits (score caps, time validation) from your dashboard's Security tab — see [Anti-cheat](/concepts/anti-cheat). Without a session, scores still submit; they just skip time validation.

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
| `OnScoreboardLoaded` | `id, config, entries` |
| `OnScoreboardRankLoaded` | `id, rank, score, streak, total` |
| `OnAchievementUnlocked` / `OnAchievementsLoaded` | `achievementId` / `achievements` |
| `OnPlaySessionStarted` | `token` |
| `OnDeviceCodeReceived` | `code, url, qrDataUrl` |
| `OnDeviceCodeApproved` / `OnDeviceCodeExpired` | `nickname` / — |
| `OnAccountUpgraded` | `oldProfile, newProfile` |
| `OnProfileLoaded` | `nickname, score, streak, achievements, playCount` |
| `OnNicknameChanged` / `OnNicknameError` | `nickname` / `error` |
| `OnArchivedScoreboardLoaded` | `archiveId, config, entries` |

Full method and event reference lives in the [SDK repo README](https://github.com/cheddatech/CheddaBoards-Unity).

## Common issues

| Issue | Fix |
|-------|-----|
| "Not authenticated" on submit | Submit ran before login finished — submit from `OnLoginSuccess` or later, not before |
| Leaderboard fires twice | You subscribed to `OnScoreboardLoaded` inside a method that runs repeatedly — subscribe once, in `Start()` |
| Empty leaderboard | Confirm your Game ID matches the dashboard, and that the board ID exists |
| Score rejected | Start a play session before the run so the backend can time-validate it — check `OnScoreError` for the reason |
| WebGL build can't read boards | Direct canister reads are CORS-simple; if you proxy your own hosting, allow `api.cheddaboards.com` |

Full error reference: [Errors](/api/errors).

**See also:** [REST API](/quickstart/rest) · [Authentication](/api/authentication) · [Anti-cheat](/concepts/anti-cheat) · [What's stored](/concepts/data-model) · [Unity SDK repo](https://github.com/cheddatech/CheddaBoards-Unity)