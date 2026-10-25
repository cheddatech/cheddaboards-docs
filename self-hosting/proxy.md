# Run the proxy

The proxy is the HTTP layer games talk to. It checks API keys, verifies Google and Apple sign-in, runs the device-code flow, applies rate limits, and calls the canister signed as your **verifier** identity. The code is [cheddatech/cheddaboards-proxy](https://github.com/cheddatech/cheddaboards-proxy), the same code that runs `api.cheddaboards.com`, under MIT.

Its README is the full reference for configuration. This page covers what you need to get a self-hosted instance right.

## Run it

Node 20 or later.

```bash
git clone https://github.com/cheddatech/cheddaboards-proxy.git
cd cheddaboards-proxy
npm ci
CANISTER_ID=<your-canister-id> VERIFIER_IDENTITY="$(cat verifier.json)" npm start   # listens on $PORT, default 8080
```

`VERIFIER_IDENTITY` is the identity you created in [Deploy the canister](/self-hosting/canister#_2-create-the-verifier-identity). In production, load it from a secret manager, never from a file in the repo.

On Google Cloud Run, buildpacks build it with no Dockerfile:

```bash
gcloud run deploy <service> --source . --region <region> --max-instances 1 \
  --set-env-vars CANISTER_ID=<your-canister-id> \
  --set-secrets VERIFIER_IDENTITY=<secret-name>:latest
```

::: warning Run exactly one instance
Rate limits, caches and pending device codes live in process memory. A second instance halves every limit and breaks device-code login, because a code minted on one instance can't be approved on the other. On Cloud Run that means `--max-instances 1`. `--min-instances 1` avoids cold starts.
:::

## Configure it

Required: `CANISTER_ID` and `VERIFIER_IDENTITY`. The rest is optional; these are the ones most self-hosters need:

| Variable | What it's for |
|---|---|
| `GOOGLE_CLIENT_IDS` | Comma-separated Google OAuth client IDs **you own**, for dashboard sign-in |
| `APPLE_BUNDLE_ID` | Your Apple Service ID / bundle ID |
| `DEVICE_AUTH_GOOGLE_CLIENT_ID`, `DEVICE_AUTH_APPLE_BUNDLE_ID` | The credentials your link page uses |
| `DEVICE_AUTH_URL` | Your link page. Defaults to `https://cheddaboards.com/link`, so **change it** |
| `CLIENT_IP_HOPS` | Where the real client IP sits in `X-Forwarded-For` (next section) |
| `PAUSED_GAMES` | Game IDs whose submits get a 503, for incidents |

The [README](https://github.com/cheddatech/cheddaboards-proxy#environment-variables) lists every variable, including each rate limit. Defaults match the hosted service; see [Rate limits](/api/rate-limits).

## Client IPs and ingress

Per-IP limits depend on knowing the real client address. Callers control the left of `X-Forwarded-For`, and each proxy in front of you appends to the right, so you set `CLIENT_IP_HOPS` to where your real IP lands, counted from the right:

1. Deploy, then run `curl -H "X-Forwarded-For: 1.2.3.4" https://<your-host>/health`.
2. In `clientIp.chain`, find your real IP and count its position from the right (the last entry is 1). Set that number.
3. Run the curl again: `resolved` should be your IP, not `1.2.3.4`.

Set it too low and everyone behind your CDN shares one IP and gets throttled together. Set it too high and callers choose their own IP.

The setting only holds for one path in. If your service is also reachable directly (Cloud Run's `*.run.app` URL alongside a CDN, say), the chain on that path is shorter and callers can pick their IP. Restrict direct access so all traffic goes through the path you measured.

## Check it

`GET /health` shows the build stamp, the principal the proxy signs as, and how it resolved your IP. **`signingPrincipal` must equal the `VERIFIER_PRINCIPAL` in your canister.** If it doesn't, every sign-in and API-key write fails with `Unauthorized`.

## Point the SDKs at your instance

The SDKs ship pointing at the hosted service. In each SDK, change the API base URL to your proxy and the direct-read URL to `https://<your-canister-id>.raw.icp0.io`. In the Godot addon these are the `API_BASE_URL` and `DIRECT_READ_URL` constants at the top of `CheddaBoards.gd`.

## What you'll build yourself

Two pieces of the hosted service aren't published yet.

**A link page, if you want device-code sign-in.** This is the web page players open on their phone to approve a code. It has to:

1. Read the code from the URL and check it with `GET /auth/device/status/:code`.
2. Sign the player in with Google or Apple using the credentials in `DEVICE_AUTH_GOOGLE_CLIENT_ID` / `DEVICE_AUTH_APPLE_BUNDLE_ID`.
3. Send `POST /auth/device/approve` with `user_code`, the provider, and the ID token (`idToken` for Google, `identityToken` for Apple).

Without one, players can still play anonymously; they just can't link an account.

**Game management.** Register games, issue keys and create boards by calling the canister as your dfx identity (see [Register games without the dashboard](/self-hosting/canister#_5-register-games-without-the-dashboard)). A dashboard of your own can use the proxy's session routes or the canister's `BySession` methods.

## Rules for your instance

These hold whether you run the proxy as published or change it:

- **Only accept OAuth tokens issued for your own client IDs and bundle ID.** Sessions are keyed on the player's email and work across every game on the instance, so accepting an audience someone else controls would let them sign in as anyone who uses their app.
- **Sign every canister call as the verifier, queries included.** API key validation and lookups by player ID return nothing for any other caller.
- **Treat game API keys as public.** They ship inside game builds. They identify a game; they don't prove a caller is trusted. Integrity comes from play-session validation, caps, rate limits and moderation.
- **Keep the verifier key like a root credential.** Encrypted, never committed, with a rotation plan. Rotate by generating a new identity, setting the new principal in `main.mo`, upgrading the canister, then updating the proxy.
- **Keep the Candid bindings in sync.** The proxy calls the canister through `_lib/cheddaboards_v2_backend.did.js`. If you change the canister's interface, regenerate it with `dfx generate` and redeploy the proxy; a missing method throws at runtime.
- **Track releases.** Security fixes land in both repos' changelogs. Upgrade the canister and proxy together when a release says so.

## Building your own instead

You can write your own HTTP layer against the Candid interface instead. The rules above are the contract; the proxy's source is the worked example. If you want the official SDKs to work unmodified, mirror the routes in the [REST reference](/api/overview).

**See also:** [Self-hosting overview](/self-hosting/overview) · [Deploy the canister](/self-hosting/canister) · [Rate limits](/api/rate-limits)
