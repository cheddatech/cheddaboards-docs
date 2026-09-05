# Build your proxy

The proxy is the HTTP layer games talk to. It verifies OAuth tokens, signs canister calls with your verifier identity, and translates plain HTTP into the canister's binary interface. **You build and host this yourself.** The hosted proxy at cheddaboards.com is closed source — it's not in the open-source release and there's no reference implementation to copy. What follows is the contract your proxy must satisfy, not the hosted proxy's code.

## What the proxy is for

The canister is deliberately gated: it only accepts privileged auth calls (minting sessions, etc.) from one principal — the **verifier**. That gate is the whole security model. It means a game client can't call the canister directly to forge a session; it has to go through something that holds the verifier's signing key and has verified the player first. That something is your proxy.

So the proxy does two jobs the canister can't do for itself:

1. **Verify OAuth tokens.** When a player signs in with Google or Apple, the proxy checks the token with the provider (e.g. via JWKS) before it will mint anything. The canister trusts the proxy to have done this.
2. **Sign canister calls as the verifier.** The proxy calls the canister with the signing identity whose principal you set as `VERIFIER_PRINCIPAL`. The canister rejects those privileged calls from anyone else.

## What your proxy needs

However you choose to build and configure it, a working proxy needs:

- **The canister ID** of your deployed instance, and an IC host — `https://icp-api.io` for mainnet, or `http://127.0.0.1:4943` for local dfx.
- **A signing identity** (e.g. an Ed25519 keypair) whose principal you set as `VERIFIER_PRINCIPAL` in `main.mo`. **Keep the private key secret** — it can mint a session for any user, so it's the most sensitive thing in your deployment. Treat it like a root credential: never commit it, store it encrypted, and have a rotation plan (the canister lets you rotate the verifier by upgrading, since it's re-applied in `postupgrade()`).
- **OAuth client IDs** for whichever providers you support — Google client ID, Apple Service ID / Bundle ID — and the logic to verify tokens against them.
- **Allowed CORS origins** for the domains your games are served from. Avoid wildcards in production.

## The interface it calls

The Candid interface (`cheddaboards.did`) defines every method and signature. The methods your proxy will lean on, by area:

- **Auth:** `socialLoginAndGetProfile`, `createSessionForVerifiedUser`, `validateSession`, `destroySession`
- **Scores:** `submitScore` (fan-out), `submitScoreToBoard` (targeted), `getLeaderboard`, `getScoreboard`, `getPlayerScoreboardRank`
- **Sessions:** `startGameSessionByApiKey`, `startGameSessionBySession`, `getPlaySessionStatus`
- **Profiles:** `getMyProfileBySession`, `getUserProfile`, `changeNicknameAndGetProfile`
- **Account linking:** `migrateAnonymousAccount`
- **Moderation:** `getScoreboardAdmin`, `removeScoreEntry`, `removePlayerScores`, `getEntryDeletionLog` (each in session and principal variants)
- **Achievements:** `unlockAchievement`, `getAchievements`

Most methods come in two flavours — a principal-authenticated variant and a `BySession` variant — because the dashboard authenticates by principal while game clients authenticate by session token. Match the variant to how the caller is authing.

::: warning Keep your Candid bindings in sync with the canister
Your proxy calls the canister through generated Candid bindings (`.did.js` / the declarations from `dfx generate`). Those bindings must contain **every method your proxy calls** — if the proxy calls a method that isn't in its copy of the interface, the call throws at runtime with an unhelpful error, not a clear "unknown method". So whenever you upgrade the canister with new or changed methods, regenerate the bindings and redeploy the proxy with the fresh copy. A canister/proxy interface mismatch is one of the easier ways to break a working deployment.
:::

## The HTTP shape is yours to define

There's no required URL scheme — your proxy exposes whatever HTTP routes you like and maps them onto canister calls. If you want the **official SDKs to work against your instance unmodified**, mirror the routes they expect (the [REST reference](/api/overview) documents the hosted API's shape). If you're only serving your own games, you're free to design the HTTP surface however suits you.

## Device-code login

The device-code sign-in flow (the QR / short-code login) lives **in the proxy layer, not the canister.** If you want it, you implement it in your proxy — issuing codes, holding pending-authorization state, and polling. The canister provides the session primitives (`createSessionForVerifiedUser` and friends); the RFC 8628 dance around them is the proxy's job.

## Honestly, though

Building a correct, secure proxy — token verification, key custody, CORS, rate limiting, session handling — is real work, and getting the verifier-key handling wrong undermines the whole gate. The [hosted service](https://cheddaboards.com) exists so you don't have to. Self-host if you specifically want to own the whole stack; otherwise the free hosted proxy runs this exact backend for you.

**See also:** [Self-hosting overview](/self-hosting/overview) · [Deploy the canister](/self-hosting/canister) · [API reference](/api/overview)