# Implementation Plan — `node-express-template`

A generic GitHub-template repository that seeds new Express + TypeScript API microservices. Supports both direct `node` execution and Docker/docker-compose.

All design decisions are **already resolved** — this plan is prescriptive. A lighter model should execute phases in order, not re-open decisions. If something is genuinely ambiguous, ask; otherwise follow the plan.

---

## Resolved decisions (reference)

| Area                      | Decision                                                                                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Language                  | TypeScript, strict                                                                                                                             |
| Runtime                   | Node 24 LTS, ESM (`"type": "module"`, `moduleResolution: NodeNext`)                                                                            |
| Package manager           | pnpm (via Corepack)                                                                                                                            |
| HTTP framework            | Express 5 (native async error handling)                                                                                                        |
| Layout                    | Feature-based — `src/core/` + `src/features/<name>/`, `app.ts` builds app, `server.ts` listens                                                 |
| Config                    | Zod schema in `src/core/config.ts`, loaded via Node native `--env-file=.env`                                                                   |
| Env vars (required)       | `NODE_ENV`, `PORT` (default 3001), `LOG_LEVEL`, `SERVICE_NAME`, `UNIVERSE` (`development\|staging\|production`)                                |
| Logging                   | `pino` + `pino-http`, JSON to stdout, `pino-pretty` in dev; base fields `service`, `universe`                                                  |
| Error handling            | `HttpError` class + central error middleware; response shape `{ error: { code, message, requestId, details? } }`; `SCREAMING_SNAKE_CASE` codes |
| Validation                | Zod `validate({ body?, query?, params? })` middleware                                                                                          |
| Example feature           | `hello` — `GET /hello/world`, `GET /hello/:name` (validated param, 1–50 chars, alphanumeric)                                                   |
| Health                    | `GET /health` only, excluded from request logs                                                                                                 |
| Middleware                | `helmet`, `cors` (via `CORS_ORIGINS`), `express.json({ limit: '1mb' })`, `pino-http` with request-id                                           |
| Rate limit / compression  | Skipped (edge concern)                                                                                                                         |
| Shutdown                  | `onShutdown(name, fn)` registry, `SIGTERM`/`SIGINT` handlers, hard timeout                                                                     |
| Testing                   | Vitest + supertest, unit + integration, `test:watch`, v8 coverage                                                                              |
| Build                     | `tsc` → `dist/`, run `node dist/server.js`                                                                                                     |
| Tooling                   | ESLint 9 flat config + `typescript-eslint`, Prettier, Husky + lint-staged, `.editorconfig`                                                     |
| Docker                    | Multi-stage, both stages `node:24-slim`, non-root `node` user, no `HEALTHCHECK`, exec-form `CMD`                                               |
| Compose                   | `api` + uncommented `db` (postgres:17-alpine), no app-side DB code                                                                             |
| CI                        | `.github/workflows/ci.yml`: lint, typecheck, test, docker build                                                                                |
| Updates                   | `.github/dependabot.yml` for npm, github-actions, docker                                                                                       |
| Docs                      | `docs/<feature>.md`, one per feature                                                                                                           |
| Auth                      | Skipped                                                                                                                                        |
| Observability beyond logs | Skipped                                                                                                                                        |
| License                   | MIT                                                                                                                                            |
| API docs style            | Skip OpenAPI, maintain `docs/<feature>.md` in lockstep with routes                                                                             |

---

## Phase 0 — Initialize package.json

```bash
cd /Users/chriskhoo/Documents/Code/templates/node-express-template
pnpm init
```

Then replace generated `package.json` with:

```json
{
  "name": "node-express-template",
  "version": "0.1.0",
  "description": "Generic Express + TypeScript API microservice template",
  "license": "MIT",
  "type": "module",
  "engines": { "node": ">=24.0.0" },
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "dev": "tsx watch --env-file=.env src/server.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node --env-file=.env dist/server.js",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "prepare": "husky"
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml,yaml}": ["prettier --write"]
  }
}
```

Bump `packageManager` to the latest pnpm 9.x at implementation time.

## Phase 1 — Install dependencies

```bash
corepack enable
pnpm add express@^5 helmet cors pino pino-http zod
pnpm add -D typescript tsx vitest @vitest/coverage-v8 supertest \
  @types/node @types/express @types/cors @types/supertest \
  eslint typescript-eslint @eslint/js \
  prettier pino-pretty husky lint-staged
pnpm exec husky init
```

After `husky init`, replace `.husky/pre-commit` contents with:

```
pnpm lint-staged
```

## Phase 2 — Config files (root)

**`tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2023"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": false,
    "sourceMap": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**`eslint.config.js`** (flat config)

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'warn',
      'no-console': 'warn',
    },
  },
);
```

**`.prettierrc`**

```json
{
  "singleQuote": true,
  "semi": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

**`.prettierignore`**

```
dist
coverage
node_modules
pnpm-lock.yaml
```

**`.editorconfig`**

```
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true
```

**`.gitignore`**

```
node_modules/
dist/
coverage/
.env
.env.local
.env.*.local
*.log
.DS_Store
.vscode/
.idea/
```

**`.dockerignore`**

```
node_modules
dist
coverage
.git
.gitignore
.env
.env.*
!.env.example
tests
*.md
.github
.vscode
.idea
Dockerfile
docker-compose.yml
```

**`.nvmrc`**

```
24
```

**`.env.example`**

```
NODE_ENV=development
PORT=3001
LOG_LEVEL=info
SERVICE_NAME=my-service
UNIVERSE=development
CORS_ORIGINS=*

# Uncomment when your service adds a database
# DATABASE_URL=postgres://app:app@db:5432/app
```

**`vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts'],
    },
  },
});
```

## Phase 3 — `src/core/`

**`src/core/config.ts`**

- Import `z` from `zod`.
- Define schema:
  - `NODE_ENV`: `z.enum(['development', 'production', 'test']).default('development')`
  - `PORT`: `z.coerce.number().int().positive().default(3001)`
  - `LOG_LEVEL`: `z.enum(['fatal','error','warn','info','debug','trace']).default('info')`
  - `SERVICE_NAME`: `z.string().min(1)`
  - `UNIVERSE`: `z.enum(['development','staging','production'])`
  - `CORS_ORIGINS`: `z.string().default('*')` (comma-separated, parsed into `string[] | '*'` in a derived field)
- Parse `process.env`; on failure, log the Zod error and `process.exit(1)` — fail-fast at boot.
- Export a frozen typed `config` object, plus `type Config`.

**`src/core/logger.ts`**

- Import `pino`.
- Build logger with:
  - `level: config.LOG_LEVEL`
  - `base: { service: config.SERVICE_NAME, universe: config.UNIVERSE }` (disable default pid/hostname with `base: {...}` that doesn't include them — pino lets you override the default base object entirely)
  - In `NODE_ENV === 'development'`, use `transport: { target: 'pino-pretty', options: { colorize: true } }`
- Export the logger instance.

**`src/core/errors.ts`**

```ts
export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
```

**`src/core/request-id.ts`**

- Tiny middleware that sets `req.id` from the `x-request-id` header if present, otherwise generates one using `crypto.randomUUID()`, and mirrors it on the response header.
- Export a function returning the Express middleware.
- Augment the Express `Request` type to include `id: string` (declaration merging in a `src/types/express.d.ts` or in this file).

**`src/core/validate.ts`**

- Export `validate({ body?, query?, params? })` factory returning an Express middleware.
- For each provided Zod schema: `schema.safeParse(req.<part>)`. On failure throw `new HttpError(400, 'VALIDATION_ERROR', 'Request validation failed', { issues: result.error.issues })`. On success, **replace** `req.<part>` with `result.data` so handlers get the typed/coerced value.

**`src/core/error-handler.ts`**

- Express 5 error middleware: `(err, req, res, _next) => { ... }`.
- If `err instanceof HttpError`: respond with `err.statusCode` and body `{ error: { code: err.code, message: err.message, requestId: req.id, details: err.details } }`. Log at `warn` if 4xx, `error` if 5xx.
- Else: log at `error` with the full error; respond 500 with `{ error: { code: 'INTERNAL_ERROR', message: 'Internal server error', requestId: req.id } }` (no stack in the response).
- Include a 404 handler (regular middleware placed after routes, before the error middleware) that throws `new HttpError(404, 'NOT_FOUND', 'Route not found')` — cleaner than branching in the error handler.

**`src/core/shutdown.ts`**

- Export `onShutdown(name: string, fn: () => Promise<void>): void` that pushes `{name, fn}` onto a module-level array.
- Export `installShutdownHandlers(server: http.Server, logger: pino.Logger)`:
  - On `SIGTERM` and `SIGINT`:
    1. Log shutdown starting.
    2. `server.close()` wrapped in a Promise (stops accepting new connections, waits for in-flight).
    3. Run all registered hooks in parallel via `Promise.allSettled`; log each success/failure.
    4. `process.exit(0)` on success.
  - Set an `setTimeout(() => { logger.error('shutdown timeout exceeded'); process.exit(1); }, 15_000).unref()` to force-exit after 15s.
  - Guard against double-invocation (flag that ignores the second signal).

## Phase 4 — `src/features/`

**`src/features/health/routes.ts`**

- Export a function `createHealthRouter(): Router` that returns an Express `Router`.
- `GET /` returns `{ status: 'ok', service: config.SERVICE_NAME, universe: config.UNIVERSE, uptime: process.uptime() }`.

**`src/features/hello/schema.ts`**

```ts
import { z } from 'zod';
export const helloParamsSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9]+$/),
});
export type HelloParams = z.infer<typeof helloParamsSchema>;
```

**`src/features/hello/routes.ts`**

- Export `createHelloRouter(): Router`.
- `GET /world` → `{ message: 'Hello, world!' }`.
- `GET /:name` using `validate({ params: helloParamsSchema })` middleware → `{ message: \`Hello, ${req.params.name}!\` }`.

## Phase 5 — `src/app.ts` and `src/server.ts`

**`src/app.ts`**

```ts
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { config } from './core/config.js';
import { logger } from './core/logger.js';
import { requestId } from './core/request-id.js';
import { errorHandler, notFoundHandler } from './core/error-handler.js';
import { createHealthRouter } from './features/health/routes.js';
import { createHelloRouter } from './features/hello/routes.js';

export function buildApp() {
  const app = express();
  app.disable('x-powered-by');

  app.use(requestId());
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as { id?: string }).id!,
      autoLogging: {
        ignore: (req) => req.url === '/health',
      },
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    }),
  );
  app.use(helmet());
  app.use(
    cors({
      origin:
        config.CORS_ORIGINS === '*' ? true : config.CORS_ORIGINS.split(',').map((s) => s.trim()),
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use('/health', createHealthRouter());
  app.use('/hello', createHelloRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
```

**`src/server.ts`**

```ts
import { createServer } from 'node:http';
import { buildApp } from './app.js';
import { config } from './core/config.js';
import { logger } from './core/logger.js';
import { installShutdownHandlers } from './core/shutdown.js';

const app = buildApp();
const server = createServer(app);

server.listen(config.PORT, () => {
  logger.info({ port: config.PORT }, 'server listening');
});

installShutdownHandlers(server, logger);
```

## Phase 6 — Tests

Tests import `buildApp` from `../src/app.ts` and use supertest against the Express app (no real listener). Provide test env vars via `tests/setup.ts` that sets `process.env.SERVICE_NAME` and `process.env.UNIVERSE` **before** any `src/` import, plus `NODE_ENV=test` so pino uses JSON (not pretty) and lives are quiet.

**`tests/setup.ts`**

```ts
process.env.NODE_ENV = 'test';
process.env.SERVICE_NAME = 'test-service';
process.env.UNIVERSE = 'development';
process.env.LOG_LEVEL = 'silent';
process.env.PORT = '0';
```

Register `setupFiles: ['tests/setup.ts']` in `vitest.config.ts`.

**`tests/health.test.ts`**

- `GET /health` → 200, body has `status: 'ok'`, `service: 'test-service'`, `universe: 'development'`, numeric `uptime`.

**`tests/hello.test.ts`**

- `GET /hello/world` → 200, body `{ message: 'Hello, world!' }`.
- `GET /hello/Ada` → 200, body `{ message: 'Hello, Ada!' }`.
- `GET /hello/bad-name!` → 400, body.error.code === `'VALIDATION_ERROR'`.
- `GET /does-not-exist` → 404, body.error.code === `'NOT_FOUND'`.

**`tests/config.test.ts`** (unit)

- Re-import config in isolation with intentionally missing `UNIVERSE`, assert it throws/exits. Use `vi.resetModules()` + `vi.stubEnv()` + a mocked `process.exit`.

## Phase 7 — Docker

**`Dockerfile`**

```dockerfile
# syntax=docker/dockerfile:1
FROM node:24-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY src ./src
RUN pnpm build
RUN pnpm prune --prod

FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
USER node
EXPOSE 3001
CMD ["node", "dist/server.js"]
```

**`docker-compose.yml`**

```yaml
services:
  api:
    build: .
    ports:
      - '3001:3001'
    env_file: .env
    depends_on:
      - db

  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      POSTGRES_DB: app
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

## Phase 8 — Docs

**`docs/health.md`** — endpoint reference: method, path, response shape, example curl + response JSON.

**`docs/hello.md`** — same for `/hello/world` and `/hello/:name`; include the `:name` validation rules and the 400 validation-error shape.

**`README.md`** — sections:

1. Title + one-line description + "GitHub template — click _Use this template_".
2. Stack summary (bullet list).
3. Requirements (Node 24, pnpm via Corepack, Docker optional).
4. Getting started (clone, `cp .env.example .env`, `pnpm install`, `pnpm dev`).
5. Running with Docker (`docker compose up --build`).
6. Environment variables (table: name, required?, default, description). Include `UNIVERSE` note: _deployment tier enum; separate from NODE_ENV_.
7. Project layout (tree with one-line blurbs).
8. Adding a new feature (copy `src/features/hello`, add `docs/<name>.md`).
9. Testing (`pnpm test`, `pnpm test:watch`, coverage).
10. Adding auth / tracing / metrics (short pointers: gateway auth header, OTel auto-instrumentation, `prom-client`, `rate-limit-redis`).
11. Deployment (agnostic — push image to registry of choice; note edge-level rate limiting).

**`CLAUDE.md`** — exact rules (ship verbatim):

```markdown
# CLAUDE.md

Conventions and rules for Claude Code sessions in services built from this template. Follow these without exception unless the user explicitly overrides.

## Layout

- Add new routes as features under `src/features/<name>/`. Each feature is self-contained (routes, schemas, handler logic).
- Shared infrastructure (logger, config, errors, middleware) lives in `src/core/`.
- `src/app.ts` builds and returns the Express app (no `listen`). `src/server.ts` binds the port and installs shutdown handlers.

## Errors

- Throw `HttpError(statusCode, code, message, details?)` from handlers. Do not write custom error-response JSON — the central error middleware handles response shape.
- Error codes use `SCREAMING_SNAKE_CASE`.

## Validation

- Validate every `req.body`, `req.query`, and `req.params` with Zod via the `validate()` middleware from `src/core/validate.ts`. Never read untrusted fields directly.

## Config

- Add new env vars to the Zod schema in `src/core/config.ts` **and** `.env.example` in the same change.
- Never read `process.env` directly outside `src/core/config.ts`.

## Logging

- Use `req.log` inside handlers (injected by `pino-http`), or the module logger from `src/core/logger.ts` elsewhere.
- Never use `console.log`.

## Testing

- Adopt TDD when implementing new features: write the failing test first, make it pass, refactor.
- Every new feature needs at least one integration test under `tests/` using `supertest` against the exported `app`. Unit tests for complex pure logic.
- Run tests and linters at the end of every executable code change and make sure they pass before reporting the task done.

## Docs

- When adding or modifying routes in `src/features/<name>/`, update `docs/<name>.md` in the same change.

## Secrets

- Never hardcode secrets, API keys, or ARNs in source code or log statements. Read them from environment variables via `src/core/config.ts`.

## When unsure

- Ask, don't assume. If a requirement is ambiguous, stop and confirm with the user.

## Commands

- `pnpm dev` — run with tsx watch
- `pnpm build` — compile with tsc
- `pnpm start` — run compiled output
- `pnpm typecheck` — type-check without emit
- `pnpm test` / `pnpm test:watch` — vitest
- `pnpm lint` / `pnpm format` — eslint / prettier
- `docker compose up --build` — run in compose (api + postgres)
```

**`LICENSE`** — MIT, copyright year = current year, holder = repo owner (leave as `Chris Khoo` based on directory owner, or ask at implementation time).

## Phase 9 — CI + Dependabot

**`.github/workflows/ci.yml`**

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
      - run: corepack enable
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/build-push-action@v6
        with:
          context: .
          push: false
          tags: node-express-template:ci
```

**`.github/dependabot.yml`**

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule: { interval: weekly }
  - package-ecosystem: github-actions
    directory: /
    schedule: { interval: weekly }
  - package-ecosystem: docker
    directory: /
    schedule: { interval: weekly }
```

## Phase 10 — Verification

Run in order; all must pass before reporting done.

```bash
pnpm install                       # installs cleanly, lockfile generated
pnpm typecheck                     # 0 errors
pnpm lint                          # 0 errors
pnpm test                          # all tests pass, including the 400 validation case
pnpm build                         # dist/ produced
node --env-file=.env dist/server.js & sleep 1
curl -sf http://localhost:3001/health | grep -q '"status":"ok"'
curl -sf http://localhost:3001/hello/world | grep -q 'Hello, world'
curl -sf http://localhost:3001/hello/Ada | grep -q 'Hello, Ada'
curl -s  http://localhost:3001/hello/bad-name! | grep -q 'VALIDATION_ERROR'
curl -s  http://localhost:3001/does-not-exist | grep -q 'NOT_FOUND'
kill %1 2>/dev/null || true

docker build -t node-express-template:local .   # image builds
```

Optional: `docker compose up --build` and re-run the curl checks against the containerized service.

## Out of scope (do NOT add)

- Rate limiting, compression
- Auth middleware
- Tracing (OTel), metrics (prom-client), X-Ray
- OpenAPI / Swagger UI generation
- Database client, ORM, or any code reading `DATABASE_URL`
- CD workflows (deploy to ECR/ECS/etc.)
- Issue/PR templates, CODEOWNERS, SECURITY.md

If something from this list is requested later, it is a separate task.

## Post-implementation (user confirms before doing)

- `git init`, initial commit, create GitHub repo, push, mark as "Template repository" in repo settings. (Ask the user before doing any of this — they did not confirm during grilling.)
