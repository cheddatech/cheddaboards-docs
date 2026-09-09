# Going to production

A pre-release pass for games shipping with CheddaBoards. Everything on this list has bitten a real integration at least once.

## Keys and identity

- **Real API key in the build.** Templates and examples ship with a placeholder — confirm your build carries your actual `cb_...` key.
- **Game ID matches the dashboard exactly.** A mismatch usually shows up as an empty leaderboard, not an error.
- **Debug logging off.** Turn off the SDK's debug output before shipping.

## Anti-cheat

- **Caps set from real data.** Per-round max just above your best legitimate run, all-time ceiling above anything a real player could accumulate. See [Anti-cheat](/concepts/anti-cheat).
- **Play sessions wired.** If time validation is on, the session token is required — and wiring the start → submit → end lifecycle costs nothing while it's off. The official SDKs handle this automatically.
- **Watch the suspicion log for the first week.** Start loose, see where real submissions cluster, then tighten.

## Sessions and accounts

- **Session persistence tested.** Sign in, fully restart the game, confirm the player is still signed in. The SDKs persist sessions automatically; REST integrations store the `sessionId` themselves — see [Authentication](/api/authentication).
- **`401`/`403` handled as sign-out.** A dead session means discard the stored token and fall back to sign-in — never retry with the same token.
- **Account linking tested on a clean install.** Play anonymously, then link — anonymous progress should merge into the account, not vanish.

## Boards and traffic

- **Every board ID your code references exists on the dashboard.**
- **Submit frequency respects the throttle** — one submit per player per board every 2 seconds. If your game submits per event, remember the gate is keyed per board.
- **Leaderboard reads sized sanely.** Fetch what you display, and prefer refreshing on submit and on screen-open over a fast polling timer.

## Privacy

- **CheddaBoards named in your privacy policy.** Most stores require one, and the honest disclosure is short — [Privacy](/concepts/privacy) has ready-made wording.

## Web / HTML5

- **Web export tested where it will actually live.** Run it inside the itch.io (or portal) iframe on a real phone — exit behaviour, touch scrolling and safe areas are covered in [Web export](/engines/web-export).

Then, before you hit publish: one full run on a completely wiped install — fresh anonymous player → play → submit → sign in → confirm the merge.
