import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

export function requestId(): RequestHandler {
  return (req, res, next) => {
    const id = (req.headers['x-request-id'] as string | undefined) ?? randomUUID();
    req.id = id;
    res.setHeader('x-request-id', id);
    next();
  };
}
