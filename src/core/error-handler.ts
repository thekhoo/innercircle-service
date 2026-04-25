import type { ErrorRequestHandler, RequestHandler } from 'express';
import { HttpError } from './errors.js';
import { logger } from './logger.js';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, 'NOT_FOUND', 'Route not found'));
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    const logLevel = err.statusCode >= 500 ? 'error' : 'warn';
    logger[logLevel]({ err, requestId: req.id }, err.message);
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        requestId: req.id,
        ...(err.details !== undefined && { details: err.details }),
      },
    });
    return;
  }

  logger.error({ err, requestId: req.id }, 'Unhandled error');
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      requestId: req.id,
    },
  });
};
