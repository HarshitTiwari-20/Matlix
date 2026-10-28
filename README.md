# Matiks

Live 1v1 mental math battles. Two players race on the same equation at the same
time — a correct answer scores a point and moves both players to the next
equation, and the highest score when the ten-question set ends wins. Built as a
Bun + Turborepo monorepo with a Next.js frontend, an Express auth API, and a
WebSocket match server.

## Architecture

```text
apps/frontend (Next.js 16 / React 19 / Tailwind 4)
   │  REST: register / login / me          WS: matchmaking + answers
   ▼                                       ▼
apps/http-backend (Express 5)          apps/ws-backend (ws)
   │  bcrypt + JWT                         │  in-memory GameEngine
   └──────────────┬────────────────────────┘
                  ▼
        packages/db (Prisma 7 + pg)
                  ▼
             PostgreSQL
```

Shared concerns:

- `packages/common` — Zod request schemas, username/password rules, JWT token
  constants, and the shared field-error formatter.
- `packages/db` — Prisma client, schema, migration, and database env loading.

The two backends trust the same JWT, so **`JWT_SECRET` must be identical** in
`apps/http-backend/.env` and `apps/ws-backend/.env`. Tokens are signed with the
issuer `matiks` and audience `matiks-web` and expire after 7 days.

## Packages

| Path                  | Description                                                        |
| --------------------- | ------------------------------------------------------------------ |
| `apps/frontend`       | Landing page, login/register, and the live play arena.             |
| `apps/http-backend`   | Express REST API: `POST /register`, `POST /login`, `GET /me`.       |
| `apps/ws-backend`     | WebSocket server, matchmaking, question generation, scoring.       |
| `packages/common`     | Shared validation and auth constants.                              |
| `packages/db`         | Prisma schema/client for users, ratings, games, questions, friends.|
| `packages/ui`         | Unused starter component library.                                  |

## Prerequisites

- [Bun](https://bun.sh) 1.3+
- Node.js 22+ (Bun runs the apps; Node is used by some tooling)
- PostgreSQL 14+

## Setup

```bash
bun install

# Environment files (examples are committed; real .env files are ignored)
cp packages/db/.env.example packages/db/.env
cp apps/http-backend/.env.example apps/http-backend/.env
cp apps/ws-backend/.env.example apps/ws-backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local

# Point packages/db/.env at your PostgreSQL instance, then:
bun run db:migrate     # or: bun run db:push
bun run dev
```

Default ports:

| Service        | URL                     |
| -------------- | ----------------------- |
| Frontend       | `http://localhost:3000` |
| HTTP API       | `http://localhost:3001` |
| WebSocket      | `ws://localhost:8080`   |

If you change ports, update `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WS_URL` in
`apps/frontend/.env.local` and the matching backend env files.

## Scripts

| Command              | What it does                                             |
| -------------------- | -------------------------------------------------------- |
| `bun run dev`        | Runs all apps through Turborepo.                         |
| `bun run build`      | Production build (Next.js).                              |
| `bun run test`       | Runs all unit and integration tests with `bun test`.     |
| `bun run check-types`| Type-checks every workspace.                             |
| `bun run lint`       | ESLint for the frontend and UI package.                  |
| `bun run db:migrate` | Creates/applies Prisma dev migrations.                   |
| `bun run db:push`    | Pushes the schema without creating a migration.          |
| `bun run db:deploy`  | Applies committed migrations (use in production/CI).     |
| `bun run db:generate`| Regenerates the Prisma client.                           |
| `bun run db:studio`  | Opens Prisma Studio.                                     |

## HTTP API

Base URL: `http://localhost:3001`

| Method | Path                 | Auth   | Body                              |
| ------ | -------------------- | ------ | --------------------------------- |
| `GET`  | `/health`            | —      | —                                 |
| `POST` | `/api/v1/auth/register` | —   | `{ email, password, username? }`  |
| `POST` | `/api/v1/auth/login` | —      | `{ email, password }`             |
| `GET`  | `/api/v1/auth/me`    | Bearer | —                                 |

Validation failures return `400` with `{ message, errors }`. Duplicate emails
return `409`. Bad credentials return a generic `401 Invalid email or password`.
Successful auth responses include `{ data: { token, user } }`; the user object
never includes the password hash.

## WebSocket protocol

Connect to `ws://localhost:8080?token=<jwt>`. Invalid or expired tokens are
closed with code `1008`. Unknown users are also rejected. The server pings every
30 seconds and drops dead sockets.

Client → server:

| Type           | Payload                                  |
| -------------- | ---------------------------------------- |
| `START_GAME`   | —                                        |
| `SUBMIT_ANSWER`| `{ gameId, questionId, answer }`         |
| `CANCEL_GAME`  | —                                        |

Server → client:

| Type              | Purpose                                                    |
| ----------------- | ---------------------------------------------------------- |
| `ONLINE_USERS`    | Online roster broadcast.                                   |
| `WAITING`         | Player is queued; includes `gameId`.                       |
| `GAME_STARTED`    | Match begins/resumes: question, index, score, members.     |
| `WRONG_ANSWER`    | Answer was incorrect; the same question stays.             |
| `NEXT_QUESTION`   | Correct answer by `userId`; next question, index, and      |
|                   | score. Broadcast to both players so both screens move on.  |
| `GAME_OVER`       | Final scores, winner (`null` = draw), members.             |
| `CANCELLED`       | Search cancelled.                                          |
| `ERROR`           | `{ message }` for invalid actions or payloads.             |

Both players share one round index and always see the same equation. A correct
answer scores a point and advances the round for both screens; a wrong answer
keeps the current equation up until either player solves it. Answers for a
finished round are rejected with `Question mismatch`. The match ends when the
set completes, and the higher score wins. Reconnecting resumes the running
match at the shared round index. Disconnecting from a running match awards the
win to the opponent. Finished games are removed from memory.

## Testing

```bash
bun run test          # all unit + integration tests
bun run check-types   # TypeScript across the workspace
bun run lint          # frontend + UI ESLint
bun run build         # Next.js production build
```

Coverage includes:

- `packages/common` — schema validation and error formatting.
- `apps/http-backend` — full register/login/me flow, CORS, malformed input,
  duplicate accounts, JWT audience/expiry, and deleted users (in-memory DB).
- `apps/ws-backend` — question generation, game-engine edge cases, and a real
  WebSocket integration suite covering matchmaking, live play, reconnect,
  disconnect, cancel, unauthorized tokens, and game cleanup.
- `apps/frontend` — credential validation, session storage, API error mapping,
  equation formatting, and the game-state reducer.
