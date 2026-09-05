# Deploy the canister

Deploying your own CheddaBoards backend to the Internet Computer. This is the first of the two self-hosting jobs; the second is [building your proxy](/self-hosting/proxy).

## Prerequisites

- [dfx](https://internetcomputer.org/docs/current/developer-docs/setup/install/) (the IC SDK)
- Basic familiarity with Motoko and the Internet Computer
- For mainnet: a cycles wallet with enough cycles to create and run a canister

## 1. Clone

```bash
git clone https://github.com/cheddatech/cheddaboards.git
cd cheddaboards
```

The repo is the backend: `src/main.mo` (the canister logic) and `src/cheddaboards.did` (the Candid interface — the full API contract).

## 2. Set your principals

Open `src/main.mo` and replace the placeholder principals (`aaaaa-aa`) with your own:

```motoko
// Your proxy's signing identity — the only principal allowed to call
// the privileged auth methods. REPLACE with your own.
private transient let VERIFIER_PRINCIPAL : Text = "aaaaa-aa";

// Super admin (your dfx identity) — REPLACE with your own
private var CONTROLLER : Principal = Principal.fromText("aaaaa-aa");

// Bootstrap admin in postupgrade() (can be the same as controller) — REPLACE
let firstAdmin = Principal.fromText("aaaaa-aa");
```

Get your own principal with:

```bash
dfx identity get-principal
```

The `VERIFIER_PRINCIPAL` is the principal of the signing identity your **proxy** will use — you'll generate that keypair when you build the proxy, so if you don't have it yet, come back and set it before you rely on auth. `CONTROLLER` and `firstAdmin` are your dfx identity (the admin of the instance).

::: warning Get CONTROLLER right the first time
The actor is `persistent`, so top-level variables are stable and survive upgrades — editing a literal after the first deploy won't change the running value. `VERIFIER_PRINCIPAL` is re-applied in `postupgrade()`, so it *can* be rotated by upgrading. `CONTROLLER` is not, so set it correctly before your first deploy.
:::

## 3. Deploy

```bash
# Local testing
dfx start --background
dfx deploy

# Production (mainnet)
dfx deploy --network ic
```

Note the canister ID it prints — your proxy will need it.

## 4. Generate the Candid bindings

```bash
dfx generate cheddaboards_v2_backend
```

The Candid interface (`cheddaboards.did`) defines every method and signature your proxy can call. Every deployed canister also gets the Candid UI for free, so you can exercise the API directly in a browser against your own instance while you build the proxy.

## What you've got, and what's next

At this point you have a running canister with all the leaderboard, achievement, moderation, and anti-cheat logic — but **games can't reach it yet.** The canister only accepts privileged auth calls from the `VERIFIER_PRINCIPAL`, and it speaks the IC's binary interface, not plain HTTP. Standing up the HTTP layer that games actually talk to is the [proxy](/self-hosting/proxy) job.

Board *reads* are the exception — the canister serves those over HTTP directly (that's how the SDKs read boards without the proxy), so a freshly deployed canister can already be read from. Everything that writes or authenticates goes through your proxy.

**Next:** [Build your proxy](/self-hosting/proxy)