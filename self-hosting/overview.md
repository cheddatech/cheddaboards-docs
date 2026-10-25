# Self-hosting

CheddaBoards is open source end to end on the server side. The backend canister and the REST proxy that runs `api.cheddaboards.com` are both public and MIT-licensed, and you can run your own copy of each. This section is how.

It's worth being upfront about what that involves.

## What's open, what you build

| Piece | Status |
|-------|--------|
| **The backend canister** (leaderboards, accounts, achievements, anti-cheat, moderation) | Open source: [cheddatech/cheddaboards](https://github.com/cheddatech/cheddaboards). Deploy your own to the Internet Computer. |
| **The REST proxy** (API keys, Google/Apple sign-in, device-code login, rate limits) | Open source: [cheddatech/cheddaboards-proxy](https://github.com/cheddatech/cheddaboards-proxy). The same code as the hosted API. Run it on any Node host. |
| **The SDKs** (Godot 4, Godot 3.6, Unity) | Open source. Point them at your proxy and canister. |
| **The link page** (`cheddaboards.com/link`, where players approve a device code) | **Not published yet.** Build your own if you want device-code sign-in. |
| **The developer dashboard** (`cheddaboards.com/developers`) | **Not published yet.** Manage games with `dfx` or the Candid UI, or build your own. |

So self-hosting is three jobs: [deploy the canister](/self-hosting/canister), [run the proxy](/self-hosting/proxy) in front of it, and decide how you'll handle the two pieces that aren't published (see [What you'll build yourself](/self-hosting/proxy#what-you-ll-build-yourself)).

::: info Releases
The public repos are published from the private source one commit per release, normally the same day it ships. The backend's CHANGELOG has upgrade notes for self-hosters, with security fixes under a **Security** heading that also names the matching proxy release. Only the latest release is supported, so track it.
:::

## Be honest with yourself about the effort

This is not a one-click deploy. Running your own instance means:

- You're comfortable with **dfx and the Internet Computer**: deploying and upgrading a canister, taking snapshots, and paying its cycles.
- You'll **run and secure a Node service**: a signing key that can mint sessions for any user, OAuth client IDs, ingress configuration and log hygiene.
- You'll **build the missing pieces** you need: a link page for device-code sign-in, and some way to register games and issue API keys.
- **You're on your own for support.** Everything is documented and open, but it's a set of parts, not a supported product.

If that's more than you want, the [hosted service](https://cheddaboards.com) is free, runs the same code, and takes a few minutes to wire up. That's the right choice for almost everyone. Self-hosting exists because infrastructure you build a game on shouldn't be something that can be taken away, not because it's the easy path.

## How the pieces fit

The canister is the permanent part. It holds the data and the rules and runs on the IC regardless of any company. The proxy is a translation layer: it turns plain HTTP into canister calls, verifies Google and Apple tokens, and signs privileged calls with its **verifier** identity. The canister accepts session minting and API-key writes only from that one principal.

That split is what lets everything be open without anything secret living in the code. The trust boundary is the verifier's private key, and when you self-host, that key is yours.

Board reads are the exception: the canister serves scoreboards over HTTP itself, so games read boards without going through the proxy at all.

**Next:** [Deploy the canister](/self-hosting/canister) · [Run the proxy](/self-hosting/proxy)
