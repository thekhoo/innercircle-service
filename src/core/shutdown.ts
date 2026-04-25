import type { Server } from 'node:http';
import type { Logger } from 'pino';

interface ShutdownHook {
  name: string;
  fn: () => Promise<void>;
}

const hooks: ShutdownHook[] = [];

export function onShutdown(name: string, fn: () => Promise<void>): void {
  hooks.push({ name, fn });
}

export function installShutdownHandlers(server: Server, log: Logger): void {
  let shuttingDown = false;

  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;

    log.info('shutdown starting');

    const hardTimeout = setTimeout(() => {
      log.error('shutdown timeout exceeded');
      process.exit(1);
    }, 15_000);
    hardTimeout.unref();

    new Promise<void>((resolve) => server.close(() => resolve()))
      .then(() =>
        Promise.allSettled(
          hooks.map(({ name, fn }) =>
            fn()
              .then(() => log.info({ hook: name }, 'shutdown hook completed'))
              .catch((err: unknown) => log.error({ err, hook: name }, 'shutdown hook failed')),
          ),
        ),
      )
      .then(() => {
        clearTimeout(hardTimeout);
        process.exit(0);
      });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
