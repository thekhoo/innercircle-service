import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import type { IncomingMessage, ServerResponse } from 'node:http';
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
      genReqId: (req: IncomingMessage) => (req as IncomingMessage & { id?: string }).id!,
      autoLogging: {
        ignore: (req: IncomingMessage) => req.url === '/health',
      },
      customLogLevel: (_req: IncomingMessage, res: ServerResponse, err?: Error) => {
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
