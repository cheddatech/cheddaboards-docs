# Self-hosting

CheddaBoards is open source. The backend canister — all the leaderboard, auth, achievement, moderation, and anti-cheat logic — is public and MIT-licensed, and you can deploy your own instance to the Internet Computer. This section is how.

It's worth being upfront about what self-hosting is and isn't.

## What's open, what you build

| Piece | Status |
|-------|--------|
| **The backend canister** (`main.mo`, the Candid interface) | Open source — [github.com/cheddatech/cheddaboards](https://github.com/cheddatech/cheddaboards). Deploy your own. |
| **The SDKs** (Godot, Unity) | Open source. Point them at your proxy. |
| **The proxy / API layer** | **Closed source.** The hosted proxy at cheddaboards.com is not part of the open-source release — you build your own. |

So self-hosting is two jobs: deploy the canister ([canister guide](/self-hosting/canister)), then build an HTTP proxy in front of it that verifies OAuth tokens and signs canister calls with your verifier identity ([proxy guide](/self-hosting/proxy)).

::: info The public repo trails the live canister
The open-source backend is kept a release or two behind the canister running the hosted service — the public repo is synced in batches, not on every deploy. So a fresh self-host gets a stable, real version of the backend, just not always the newest one that's live at cheddaboards.com. The interface is stable; the gap is in fixes and features that haven't been pushed to the public mirror yet.
:::

## Be honest with yourself about the effort

This is not a one-click deploy or a Docker template. Running your own instance means:

- You're comfortable with **dfx and the Internet Computer** — deploying, upgrading, and managing a canister, and paying its cycles.
- You'll **write and host your own proxy** — the canister is deliberately gated so it only accepts privileged auth calls from a signing identity you control, which means there's an HTTP layer you have to build and run. There's no reference proxy to copy.
- You'll **manage your own OAuth credentials, CORS, secrets, and key rotation.**
- **You're on your own for support.** The whole stack is available and the interface is documented, but self-hosting is a "here are the parts, assemble them" arrangement, not a supported product.

If that sounds like more than you want to take on, the [hosted service](https://cheddaboards.com) is free, runs the same backend, and takes about three minutes to wire up — that's the recommended path for almost everyone. Self-hosting exists because infrastructure you build a game on shouldn't be something that can be taken away, not because it's the easy option.

## Why it's built this way

The canister is the permanent, on-chain part — it holds the data and the rules, and it runs on the IC regardless of any company. The proxy is a thin translation layer: it turns plain HTTP into canister calls and verifies OAuth tokens before minting sessions. Keeping the two separate is what lets the canister be fully open (nothing secret lives in it) while the trust boundary — the signing identity that's allowed to mint sessions — stays under whoever operates the instance. When you self-host, that identity is yours.

**Next:** [Deploy the canister](/self-hosting/canister) · [Build your proxy](/self-hosting/proxy)