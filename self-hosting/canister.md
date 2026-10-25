# Deploy the canister

Deploying your own CheddaBoards backend to the Internet Computer. This is the first of the self-hosting jobs; the second is [running the proxy](/self-hosting/proxy).

## Prerequisites

- [dfx](https://internetcomputer.org/docs/current/developer-docs/setup/install/), the IC SDK. Production is built with dfx 0.32.0.
- Node 20 or later, to generate the verifier identity (and later to run the proxy).
- For mainnet: cycles to create and run a canister.
- Basic familiarity with Motoko and the Internet Computer.

## 1. Clone

```bash
git clone https://github.com/cheddatech/cheddaboards.git
cd cheddaboards
```

The canister source is in `src/cheddaboards_v2_backend/`: `main.mo` is the actor, and `types`, `apikeys`, `players` and `scoreboards` are the modules it imports. The Candid interface isn't checked in; it's generated from the source when you build.

## 2. Create the verifier identity

The verifier is the signing identity your proxy uses. It is the only principal the canister accepts session minting and API-key writes from, so create it first and set its principal in the next step.

From any folder that has `@dfinity/identity` installed (the proxy repo, after `npm ci`, works):

```bash
node -e "const {Ed25519KeyIdentity}=require('@dfinity/identity');const i=Ed25519KeyIdentity.generate();console.error('principal:',i.getPrincipal().toText());console.log(JSON.stringify(i.toJSON()))" > verifier.json
```

The principal prints on screen; the identity goes into `verifier.json`. That file is the proxy's `VERIFIER_IDENTITY`. **It can mint a session for any user**, so move it straight into your secret store or password manager and delete the file. Never commit it.

## 3. Set your principals

Open `src/cheddaboards_v2_backend/main.mo` and replace the three placeholder principals (`aaaaa-aa`):

```motoko
// Your proxy's signing identity: the only principal allowed to make
// privileged calls. REPLACE with the principal from step 2.
private transient let VERIFIER_PRINCIPAL : Text = "aaaaa-aa";

// Super admin (your dfx identity). REPLACE with your own.
private var CONTROLLER : Principal = Principal.fromText("aaaaa-aa");

// Bootstrap admin in postupgrade() (can be the same as controller). REPLACE.
let firstAdmin = Principal.fromText("aaaaa-aa");
```

Get your dfx principal with `dfx identity get-principal`. Then check nothing was missed; this should print nothing:

```bash
grep -n "aaaaa-aa" src/cheddaboards_v2_backend/main.mo
```

::: warning Get CONTROLLER right the first time
The actor is `persistent`, so top-level variables are stable and survive upgrades: editing a literal after the first deploy doesn't change the running value. `VERIFIER_PRINCIPAL` is re-applied in `postupgrade()`, so you can rotate the verifier by upgrading. `CONTROLLER` is not, so set it correctly before your first deploy.
:::

## 4. Deploy

```bash
# Local testing
dfx start --background
dfx deploy

# Mainnet, first install
dfx deploy --network ic
```

Note the canister ID it prints; the proxy needs it. The canister uses enhanced orthogonal persistence (`--enhanced-orthogonal-persistence` in `dfx.json`).

A fresh canister can already serve board reads over HTTP (`https://<canister-id>.raw.icp0.io/games/<gameId>/scoreboards/<boardId>`), but everything that writes or signs in goes through the proxy.

## 5. Register games without the dashboard

The hosted developer dashboard isn't published, so on your own instance you register games and issue keys by calling the canister as your dfx identity. The games you register this way are owned by that identity.

```bash
# gameId, name, description, maxScorePerRound, maxStreakDelta,
# absoluteScoreCap, absoluteStreakCap, gameUrl, accessMode
dfx canister call --network ic cheddaboards_v2_backend registerGame '("my-game","My Game","",null,null,null,null,null,null)'

# The game's API key (all-time, weekly and daily boards are created automatically)
dfx canister call --network ic cheddaboards_v2_backend generateApiKey '("my-game")'

# Optional: a targeted per-level board
# gameId, boardId, name, description, period (allTime|daily|weekly|monthly|custom),
# sortBy (score|streak), maxEntries, targeted, intervalDays
dfx canister call --network ic cheddaboards_v2_backend createScoreboard '("my-game","level-1","Level 1","","allTime","score",null,true,null)'
```

Every method is also available in the Candid UI for your canister (`https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=<canister-id>`), which is handy for exploring.

## 6. Upgrade safely

Every upgrade follows the same routine:

```bash
dfx canister --network ic stop cheddaboards_v2_backend
dfx canister --network ic snapshot create cheddaboards_v2_backend
dfx deploy cheddaboards_v2_backend --network ic --mode upgrade --wasm-memory-persistence keep
dfx canister --network ic start cheddaboards_v2_backend
```

- **Read the CHANGELOG first.** Each release has notes for self-hosters. Some need two deploys, and removing a stable field needs a one-shot migration.
- **The snapshot is your only rollback.** To roll back: stop, then `dfx canister --network ic snapshot load cheddaboards_v2_backend <snapshot-id>`, then start.
- **Keep one snapshot at a time.** Each is a full copy of the heap and counts towards memory and cycle burn. Use `snapshot create --replace <id>` and delete it once the upgrade is proven.
- **Check the module hash.** `dfx canister --network ic info cheddaboards_v2_backend` should match `shasum -a 256` of the wasm you built. Trust that, not dfx's success message.
- **Sanity-check state.** Save `getSystemInfo` before the upgrade and diff it after; only live counters should move.

## 7. Keep an eye on it

- `memStats` (query) and `GET /metrics` on the raw domain report cycles, memory and map sizes, with a warning status below 5T cycles or above 1.5 GB.
- Admin commands go through `adminGate`. After upgrading to v0.13.0 or later, run `adminGate("sweepOrphanApiKeys", [])` once to see keys left behind by deleted games, then with `["confirm"]` to revoke them.

**Next:** [Run the proxy](/self-hosting/proxy)
