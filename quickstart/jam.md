# Game jams

**A global leaderboard for your jam game, in the time it takes your coffee to brew.** Free, no player accounts, works in web builds on itch.io — and the board keeps running long after the jam ends.

## Why bother, mid-jam?

Because during the rating period, a leaderboard is a retention machine. Raters play a jam game once, rate it, move on — unless there's a score to beat. A visible global board turns "played it" into "played it four times trying to knock #1 off", and players who replay leave better ratings and comments. It's the cheapest engagement feature you can ship in a jam.

The parts that matter for jam conditions:

- **Players need no account.** Anonymous login is a persistent device ID — raters land on the board on their first run, zero sign-up friction. (Nobody creates an account to rate a jam game. They don't have to.)
- **Web builds work.** Board reads are CORS-simple, so an itch.io-embedded HTML5 export reads leaderboards with no proxy or server of yours. See [Web export](/engines/web-export).
- **It's free.** No card, no tier to pick mid-jam. Register a game, get an API key, go.
- **Daily and weekly boards are automatic.** Every game gets all-time, weekly, and daily boards with automatic archiving — a "today's best" board resets itself while you sleep.

## The 3-minute path, by engine

### Godot 4 — the drop-in

Install the [CheddaBoards addon](https://store.godotengine.org/asset/cheddatech/cheddaboards) from the Godot Asset Store (enable the plugin; the autoload registers itself), then:

```gdscript
func _ready():
    CheddaBoards.set_api_key("cb_my-jam-game_xxxxxxxxx")
    CheddaBoards.set_game_id("my-jam-game")
    CheddaBoards.leaderboard_loaded.connect(_on_leaderboard)
    await CheddaBoards.wait_until_ready()
    CheddaBoards.login_anonymous()   # nameless — players stay "Guest" until they pick a name

func _on_game_over(score: int, streak: int):
    CheddaBoards.submit_score(score, streak)

func show_leaderboard():
    CheddaBoards.get_leaderboard("score", 100)

func _on_leaderboard(entries: Array):
    for e in entries:
        print("#%d %s - %d" % [e.rank, e.nickname, e.score])
```

That's the whole integration. Full walkthrough: [Godot quick start](/quickstart/godot). Starting a game from nothing at hour zero? The [template](/engines/godot-4) is a working project with menus, sign-in, and a leaderboard scene already wired — replace the example game with yours.

### Unity — one file

Copy `CheddaBoards.cs` from the [Unity SDK repo](https://github.com/cheddatech/CheddaBoards-Unity) into your project — no packages, no scene setup:

```csharp
var cb = CheddaBoards.Instance;
cb.SetApiKey("cb_my-jam-game_xxxxxxxxx");
cb.SetGameId("my-jam-game");
cb.OnLoginSuccess += (nick) => canSubmit = true;
cb.LoginAnonymous();                      // nameless — see the Godot note above

// at game over:
CheddaBoards.Instance.SubmitScore(score, streak);
```

Full walkthrough (and a complete demo game to crib from): [Unity quick start](/quickstart/unity).

### Anything else — two HTTP calls

Bevy, Love2D, PICO-8 exports, hand-rolled JS — if it can POST JSON, it can have a leaderboard. Generate a persistent player ID client-side, then:

```
POST /scores          { playerId, gameId, score, streak }
GET  /leaderboard?sort=score&limit=10
```

That's the entire required surface. [REST quick start](/quickstart/rest).

## Jam checklist

- [ ] **Register the game before the jam starts** — [cheddaboards.com](https://cheddaboards.com/developers) takes a minute, but it's a minute you won't want at hour 47. (Registering a game ahead of a jam breaks no jam rule anywhere — it's infrastructure, not gameplay.)
- [ ] Log in **nameless** (`login_anonymous()` with no argument) — players keep any name they set, and unnamed players show as "Guest"
- [ ] Submit only **after** login completes (from game-over code, not before `login_success` / `OnLoginSuccess`)
- [ ] Web export: the file must be `index.html`, and test it served (`python3 -m http.server`), never from `file://`
- [ ] Turn `debug_logging` off before you build
- [ ] Put the leaderboard **on the game-over screen**, not behind a menu — raters should trip over it

## Jam-shaped details

**Need more than 3 game slots for a jam?** The free tier is 3 games; hit **Request More Slots** in the dashboard and mention it's for a jam — jam requests get bumped.

**Rate limits won't bite you.** Submits are throttled at one per player per board every 2 seconds — a normal game-over loop never notices. If you're doing something weirder (per-kill submits, presence heartbeats — [it's been done](/concepts/category-boards)), targeted boards are throttled per board, so spreading writes is fine.

**Anti-cheat is optional and probably worth skipping at first.** Play sessions and time validation exist ([Anti-cheat](/concepts/anti-cheat)) and jam leaderboards do attract the occasional 999999999. For a 48-hour jam, ship without it and turn on score caps from the dashboard's Security tab if someone misbehaves — no code change needed for caps. Add play sessions if you keep the game alive after.

**The board outlives the jam.** Scores live on the Internet Computer — the leaderboard keeps working after the rating period, after the jam page goes quiet, for as long as you care. If the jam game becomes a real game, everything carries over: same API key, same board, same players.

## Common jam-weekend issues

| What you see | Fix |
|--------------|-----|
| "Not authenticated" on submit | Submit ran before login finished — submit from your game-over code |
| Blank screen on itch.io | Export must be named `index.html`; test it served locally, not from `file://` |
| Empty leaderboard | Game ID doesn't match the dashboard |
| Score rejected | You enabled time validation but aren't starting play sessions — turn validation off, or start sessions |
| Player's name reverted | You're passing a name to `login_anonymous()` every launch — log in nameless |

Full list: [Errors](/api/errors).

**See also:** [Godot quick start](/quickstart/godot) · [Unity quick start](/quickstart/unity) · [REST quick start](/quickstart/rest) · [Web export](/engines/web-export) · [Timed leaderboards](/concepts/timed-leaderboards)
