# CLAUDE.md

Conventions and rules for Claude Code sessions in services built from this template. Follow these without exception unless the user explicitly overrides.

## New Endpoints

- Whenever introducing a new endpoint, always update the bruno schemas to make sure it can be tested easily.

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
