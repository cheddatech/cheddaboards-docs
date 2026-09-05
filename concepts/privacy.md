# Privacy

CheddaBoards is built to store the **minimum** needed to run leaderboards, so integrating it puts very little player data in play. This page is the developer's view: what CheddaBoards collects, what that means for your own privacy obligations, and where the canonical policy lives.

The full, player-facing policy is at [cheddaboards.com/privacy](https://cheddaboards.com/privacy) — that's the source of truth. This page summarizes it from an integrator's angle and never overrides it.

## What CheddaBoards stores about your players

**Anonymous players (the default):** a random device-tied identifier, the nickname, and their scores, streaks, play counts, and achievement IDs. No email, no real name, no account. A player can be on your board without providing any personal information at all.

**Signed-in players:** additionally, the email address and provider (Google or Apple) for the linked account — used as sign-in identity and to merge progress across devices. CheddaBoards never receives the player's password; sign-in happens with Google or Apple directly, and only the token they issue is verified.

That's the whole set. See [What's stored](/concepts/data-model) for the field-by-field shape.

## What it deliberately doesn't collect

No passwords, no payment info, no advertising identifiers or cross-site tracking, no precise location, no device contents. There are no tracking cookies in the API. This matters to you because it means **integrating CheddaBoards doesn't add an ad-tracking or data-broker surface to your game** — a claim you can make honestly to your own players.

## What's public

Leaderboards are public by design: a player's **nickname, scores, streaks, and achievements** are visible to other players, and their cross-game profile carries these between CheddaBoards games. A player's **email is never shown publicly** — only the nickname. Worth surfacing in your own UI so players pick a nickname they're happy to see on a scoreboard.

## Where the data lives

Game data is stored on the **Internet Computer** (replicated across independent node providers), and the API layer processes requests in transit. Both are infrastructure processors acting on CheddaTech's behalf, not given data for their own use. You don't run or host any of this — there's no player-data store on your side unless your game keeps its own.

## What this means for your privacy policy

If you publish a privacy policy for your game (and on most stores you must), and your game uses CheddaBoards, the honest disclosure is short:

- Your game sends a nickname and score data to CheddaBoards, a third-party leaderboard service, to display leaderboards.
- If you offer sign-in, players may link a Google or Apple account, and their email is stored by CheddaBoards for that purpose.
- Link to CheddaBoards' own policy so players can read the detail: `https://cheddaboards.com/privacy`.

A real example: the browser game *Flood of Packages* publishes a short bilingual policy that names CheddaBoards as its leaderboard service, discloses nickname transmission, describes the anonymous local identifier, and gives a deletion-request contact. That's the shape of a good, minimal disclosure.

::: warning You are your players' first contact
CheddaBoards is a processor for the leaderboard data, but **your game is what your players installed.** Deletion requests, questions, and store-review privacy fields are yours to field first. The next section is what you can tell them.
:::

## Deletion and player rights

Two routes exist, and it's worth knowing which is which:

- **You can remove a player's data from your game yourself** — a single entry or a full wipe across your boards — from the dashboard [moderation](/concepts/moderation) tools. This is immediate and covers "please remove my score from your game."
- **CheddaBoards handles full data-subject requests** (access, correction, deletion, export, restriction under UK GDPR) directly: a player emails info@cheddaboards.com and CheddaTech acts on it. Point a player there for anything beyond removing their scores from your specific game.

## Children

Anonymous play collects no personal information. Account linking uses Google or Apple, which carry their own age requirements. CheddaBoards doesn't knowingly collect personal information from children under 13. If your game targets children, keep that in mind when deciding whether to offer account linking at all — anonymous-only is the zero-personal-data option.

**See also:** [Full privacy policy](https://cheddaboards.com/privacy) · [What's stored](/concepts/data-model) · [Moderation](/concepts/moderation) · [Players and accounts](/concepts/accounts)