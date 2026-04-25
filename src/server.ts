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
