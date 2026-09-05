# What's stored

The short version: for each player, CheddaBoards keeps a **personal best** (high score and high streak) on each board, a small **profile**, and the **achievements** they've unlocked. Your per-run details — hits, level, accuracy — stay on the device. Here's the whole picture.

## The leaderboard entry

One row per player, per board. Reading a board gives you:

| Field | What it is |
|-------|------------|
| `rank` | The player's position on that board |
| `nickname` | The player's public display name |
| `score` | The player's **highest** score on that board |
| `streak` | The player's **highest** streak on that board |
| `authType` | How the player signed in (e.g. `external` for anonymous / API-key play) |

A few things worth knowing:

- **It's a personal best, not a history.** Submitting a lower score never replaces a higher one — only the best survives. There's one row per player, not one per run.
- **Score and streak are independent maxima.** Your best score and your best streak don't have to come from the same run; each is kept as its own high-water mark.
- **Bests are per board.** Your all-time best and your weekly best are tracked separately, so the same player can sit at different scores on different boards.

## The player profile

One profile per player, per game. Reading it back (`GET /players/{playerId}/profile`, or embedded in sign-in responses) looks like:

```json
{
  "nickname": "PlayerName",
  "created": 1788570532131407400,
  "gameProfile": {
    "score": 1234,
    "streak": 3,
    "achievements": ["first_win", "combo_10"],
    "playCount": 2,
    "lastPlayed": 1788571122315540500
  }
}
```

| Field | Notes |
|-------|-------|
| `nickname` | Public display name — the only identity other players ever see |
| `score` / `streak` | The player's bests, as above |
| `playCount` | How many runs they've finished |
| `achievements` | The set of achievement IDs they've unlocked |
| `created` / `lastPlayed` | Timestamps in **nanoseconds** since epoch — divide by 1,000,000 for JavaScript milliseconds |
| user ID | **Private.** Anonymous players get a generated `dev_…` ID; signed-in players are identified by their Google/Apple account (which may be an email address). It identifies and links the account and is **never shown to anyone** — only the nickname is public. |

## Achievements

Achievements are stored as **unlocked / not-unlocked flags, keyed by ID** — not free-form data. They live on the player's profile (the `achievements` array above), including for anonymous players, whose achievements are kept server-side against their anonymous profile, not just on the device. When an anonymous player later links a Google/Apple account, their achievements come with them (see [account linking](#identity-account-linking) below). Use them for milestones and badges, not as a place to stash per-run stats.

## Scoreboards & archives

Every game gets its standard time-based boards (all-time, weekly, daily) automatically, and you can add as many custom boards as you like. Each board tracks its own per-player bests.

When a timed board resets — weekly at Monday 00:00 UTC, daily at midnight UTC, monthly on the 1st — its final standings are **archived**: a snapshot you can read back later (e.g. "last week's winners"). Resetting a board doesn't throw the results away; the archive keeps them. See [Timed leaderboards](/concepts/timed-leaderboards).

## Identity & account linking

- **Anonymous:** a `dev_<timestamp>_<random>` ID your game generates and stores on the device. The profile is created on the first score submission.
- **Signed in:** Google or Apple, via device code. The account is identified by a private user ID (possibly an email), never shown publicly.
- **Linking:** an anonymous player can upgrade to a Google/Apple account and keep all their progress. Everything carries over, but the merge rules differ by field:
  - **Score and streak** merge as **per-field maxima** — the higher value wins, so linking can only ever keep or raise a best, never lower one.
  - **Achievements** are **combined** — the union of both sets, deduplicated.
  - **Play count** is **summed** — the total reflects all runs finished across both.

  After the merge, the anonymous account is absorbed into the linked one — no separate anonymous profile is left behind. Full flow: [Authentication](/api/authentication#upgrading-anonymous-verified-account-linking).

## Play sessions

A play session is a **short-lived server-side token** created for a single run, used to validate the score against elapsed time (anti-cheat). It isn't long-term player data — it exists only around a run and is cleared once the score is submitted or the session expires unused. See [Anti-cheat](/concepts/anti-cheat).

## Developer moderation & the deletion log

Game owners can remove score entries from their own boards — a single entry on one board, or a player's entries across every board — from the dashboard. See [Moderation](/concepts/moderation).

Each removal is recorded in a small, capped **deletion audit log**. Log entries identify the affected player only by a **one-way hash** — the raw user ID (email or principal) is never written to the log, so it can't leak identity.

## What CheddaBoards does *not* store

- **The rest of your run stats.** On the Godot template, `hits`, `misses`, `level`, and `accuracy` are used for the game-over screen and achievement checks, then discarded — they never reach the server. See [where each value goes](/engines/godot-4#where-each-value-goes).
- **Arbitrary per-entry metadata.** A score row is score + streak — there's no free-form field to attach extra data to an entry. To rank a custom value, map it onto score or streak.
- **Anything you don't send.** Beyond the entries, profiles, achievements, archives, and the deletion log described above, the data model is exactly what's on this page.

**See also:** [REST quick start](/quickstart/rest) · [Timed leaderboards](/concepts/timed-leaderboards) · [Authentication](/api/authentication) · [Anti-cheat](/concepts/anti-cheat) · [Moderation](/concepts/moderation)