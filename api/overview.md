# API overview

CheddaBoards is a plain HTTP/JSON API. Any engine or language that can make a request can use it — the official SDKs are convenience wrappers over these same endpoints.

New here? Start with the [REST quick start](/quickstart/rest) for a walkthrough. This section is the endpoint-by-endpoint reference.

## Base URL

```
https://api.cheddaboards.com
```

Browser-safe (CORS enabled), so HTML5 games can call it directly. Board *reads* are also served straight from the [Internet Computer canister](/quickstart/rest#reading-boards-straight-from-the-chain) with no proxy in the path.

## Authentication

Every request identifies the game; how it identifies the *player* depends on the call.

| Header | When |
|--------|------|
| `X-Game-ID` | Always |
| `X-API-Key` | Anonymous / API-key requests |
| `X-Session-Token` | After a player signs in (send instead of the API key) |

`X-API-Key` and `X-Session-Token` are mutually exclusive — full detail in [Authentication](/api/authentication).

## Response shape

Success:

```json
{"ok":true,"data":{ ... }}
```

Failure:

```json
{"ok":false,"error":"<message>"}
```

Always check `ok` before reading `data`. Status codes and error strings are in [Errors](/api/errors).

## The endpoints

| Area | Endpoints | Reference |
|------|-----------|-----------|
| Submit scores | `POST /scores` | [Scores](/api/scores) |
| Read boards | `GET /leaderboard`, `GET /games/{id}/scoreboards/...` | [Scoreboards](/api/scoreboards) |
| Players | `GET /players/{id}/profile`, `/rank`, nickname changes | [Players](/api/players) |
| Sign-in | `POST /auth/device/code`, `/auth/device/token`, `/migrate-account` | [Authentication](/api/authentication) |
| Play sessions | `POST /play-sessions/start`, `/end` | [Scores](/api/scores#anti-cheat-time-validation) |
| Achievements | `POST /achievements` | [Achievements](/api/achievements) |
| Moderation | admin & deletion routes (owner session) | [Moderation](/concepts/moderation) |

## Conventions

- All request and response bodies are JSON.
- Game and scoreboard IDs in URL paths must be 1–64 characters of letters, digits, `_` or `-`; anything else is rejected with a `400` before reaching the backend.
- Timestamps in responses are **nanoseconds** since epoch (ICP-standard) — divide by 1,000,000 for JavaScript milliseconds.
- Rate limit: one score submit per player per board every 2 seconds.

**See also:** [REST quick start](/quickstart/rest) · [Scores](/api/scores) · [Authentication](/api/authentication) · [Errors](/api/errors)