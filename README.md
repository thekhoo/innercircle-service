# innercircle-service

Backend API service for the [InnerCircle sweepstake UI](https://github.com/thekhoo/innercircle-ui). Manages users, events, and sweepstake data.

---

## Stack

- **Runtime**: Node 24 LTS, ESM
- **Framework**: Express 5
- **Language**: TypeScript (strict)
- **Package manager**: pnpm (via Corepack)
- **Logging**: Pino + pino-http (JSON to stdout)
- **Validation**: Zod
- **Testing**: Vitest + supertest
- **Linting**: ESLint 9 flat config + typescript-eslint
- **Formatting**: Prettier
- **Containerisation**: Docker multi-stage + docker-compose

---

## Requirements

- Node 24+ (use `.nvmrc` with `nvm use` or `fnm use`)
- pnpm — enabled via Corepack: `corepack enable`
- Docker (optional, for containerised runs)

---

## Getting started

```bash
git clone https://github.com/thekhoo/innercircle-service my-service
cd my-service
cp .env.example .env        # fill in SERVICE_NAME, UNIVERSE, etc.
pnpm install
pnpm dev
```

The server starts on `http://localhost:3002`. `pnpm dev` uses `tsx watch`, which automatically restarts on any source file change — no nodemon needed.

---

## Running with Docker

```bash
docker compose up --build
```

This starts the API on port 3002 and a local Postgres instance on port 5432. Uncomment `DATABASE_URL` in `.env` when connecting to the database.

---

## Environment variables

| Name           | Required | Default       | Description                                                                                                                             |
| -------------- | -------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`     | No       | `development` | Node environment (`development\|production\|test`)                                                                                      |
| `PORT`         | No       | `3002`        | Port the server listens on                                                                                                              |
| `LOG_LEVEL`    | No       | `info`        | Pino log level (`fatal\|error\|warn\|info\|debug\|trace`)                                                                               |
| `SERVICE_NAME` | **Yes**  | —             | Identifier added to every log line                                                                                                      |
| `UNIVERSE`     | **Yes**  | —             | Deployment tier enum (`development\|staging\|production`). Separate from `NODE_ENV` — a staging deploy still runs `NODE_ENV=production` |
| `CORS_ORIGINS` | No       | `*`           | Comma-separated allowed origins, or `*` for all                                                                                         |

---

## Project layout

```
src/
  core/           # Shared infrastructure (config, logger, errors, middleware)
    config.ts     # Zod-validated env config, fail-fast at boot
    logger.ts     # Pino logger instance
    errors.ts     # HttpError class
    request-id.ts # x-request-id middleware
    validate.ts   # Zod validation middleware factory
    error-handler.ts  # Central error + 404 middleware
    shutdown.ts   # Graceful shutdown registry
  features/
    health/       # GET /health
    hello/        # GET /hello/world, GET /hello/:name
  app.ts          # Builds and returns the Express app
  server.ts       # Binds port, installs shutdown handlers
tests/            # Vitest + supertest integration tests
docs/             # Per-feature endpoint reference
```

---

## Adding a new feature

1. Copy `src/features/hello` → `src/features/<name>`.
2. Define Zod schemas in `schema.ts`, routes in `routes.ts`.
3. Register the router in `src/app.ts`.
4. Add `docs/<name>.md` with the endpoint reference.
5. Add integration tests under `tests/<name>.test.ts`.

---

## Testing

```bash
pnpm test           # run once
pnpm test:watch     # watch mode
pnpm test:coverage  # with v8 coverage report
```

---

## Local HTTP testing (Bruno)

Pre-built requests live in `bruno/`. Install the [Bruno VSCode extension](https://marketplace.visualstudio.com/items?itemName=bruno-api-client.bruno) (VSCode will prompt you via the workspace recommendation), open any `.bru` file, select the **local** environment, and click **Send**.

```
bruno/
  environments/
    local.bru       # baseUrl = http://localhost:3002
  health/
    health-check.bru
  hello/
    hello-world.bru
    hello-name.bru
    hello-invalid-name.bru   # demonstrates 400 VALIDATION_ERROR
    not-found.bru            # demonstrates 404 NOT_FOUND
```

When adding a new feature, add a matching folder under `bruno/` with requests for each route.

---

## Adding auth / tracing / metrics

- **Auth**: Validate a gateway-injected header (e.g. `x-user-id`) in a `src/core/auth.ts` middleware. Avoid per-route auth — attach it globally or at the router level.
- **Tracing**: Use [OTel Node auto-instrumentation](https://opentelemetry.io/docs/languages/js/automatic/) — zero code changes required.
- **Metrics**: Add [`prom-client`](https://github.com/siimon/prom-client) and expose `/metrics`.
- **Rate limiting**: Handle at the edge (API Gateway, nginx, Cloudflare) rather than in-process. If you need app-level limiting: [`rate-limit-redis`](https://github.com/wyattjoh/rate-limit-redis).

---

## Deployment

Build and push the image to any registry:

```bash
docker build -t innercircle-service:latest .
docker push <registry>/innercircle-service:latest
```

The image runs as the non-root `node` user, listens on port 3002, and expects all config via environment variables. Rate limiting and TLS termination belong at the edge.
