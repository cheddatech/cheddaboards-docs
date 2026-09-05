# Players and accounts

Every score, streak, and achievement belongs to a **player**. This page explains what a player *is* in CheddaBoards — how anonymous and signed-in players differ, what's public versus private, and how one becomes the other without losing progress.

## Two kinds of player

**Anonymous.** A player identified by an ID your game generates and stores on the device — the SDKs use the form `dev_<unixtime>_<random>`. No account, no sign-in, no email. The profile is created the first time they submit a score. This is the zero-friction default: a player can be on the leaderboard seconds after opening your game.

**Signed in.** A player who has authenticated with Google or Apple via [device code](/concepts/device-code). Their account is identified by a private user ID tied to that provider. Signing in buys two things an anonymous player doesn't have: their progress follows them **across devices**, and it survives a cleared browser cache or a reinstall.

Both kinds are full leaderboard citizens — anonymous players rank, earn achievements, and appear on boards exactly like signed-in ones. Signing in is about *portability of identity*, not access.

## Public vs. private

Only one thing about a player is ever public: their **nickname**. That's the sole identity other players see on a leaderboard.

Everything else is private. The anonymous `dev_…` ID, and a signed-in player's provider account (which may be an email address), are used internally to identify and link the account and are **never exposed** — not on boards, not in profile reads other players can make, not in the moderation deletion log (which stores only a one-way hash). See [What's stored](/concepts/data-model) for the field-by-field picture.

### Nicknames

Nicknames are **3–16 characters, letters, digits, and underscores** (`A–Z a–z 0–9 _`). Two behaviors worth knowing:

- **Taken names auto-suffix.** Asking for a nickname someone already has isn't an error — the backend appends a number (`Chedz` → `Chedz_1`) and tells you the name it actually applied. Only a genuinely invalid name (too short, bad characters) is rejected, and that rejection is permanent for that value.
- **Nicknames aren't unique identity.** Because of suffixing, two players can have very similar names, and a nickname can change. The stable identity is always the private user ID, never the display name.

## What a profile holds

One profile per player, per game — score and streak bests, play count, unlocked achievements, and the nickname. The full shape is on the [data model page](/concepts/data-model#the-player-profile). The key idea: a profile is a set of **bests and totals**, not a history of runs. There's one row per player on each board, and it only ever moves up.

## Becoming a signed-in player (linking)

An anonymous player can sign in later and keep everything. The anonymous progress **merges** into the account rather than being replaced:

- **Score and streak** take the higher value per field — linking can only raise or keep a best, never lower one.
- **Achievements** combine into the union of both sets.
- **Play counts** add together.

After the merge the anonymous profile is absorbed and gone — linking is one-way, there's nothing to unlink back to. And because the merge is per-field maxima, a player who's been anonymous on two devices can link both to the same account and their best-of-everything comes together cleanly.

The mechanics — the `/migrate-account` call, the device-code flow, the signals — are in [Authentication](/api/authentication#upgrading-anonymous-verified-account-linking).

### Why linking matters to you, the developer

It's tempting to think of sign-in as a feature for the player's benefit only. It's also **retention infrastructure**: a linked player survives the things that otherwise silently lose you a player — a cleared browser cache, a new phone, a reinstall. An anonymous player who does any of those becomes a brand-new anonymous player, their old bests stranded on an ID the device no longer holds. Linking is the fix, which is why the SDKs surface it as "save your progress" rather than "create an account."

You don't have to push it. Anonymous-only is a perfectly good mode, and many players will never link. But offering the option — especially after a personal best, or when a returning player's local data looks empty — is the single highest-leverage thing you can do for player retention.

**See also:** [Authentication](/api/authentication) · [Device code login](/concepts/device-code) · [What's stored](/concepts/data-model) · [Privacy](/concepts/privacy)