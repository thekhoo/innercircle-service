import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';
import { HttpError } from './errors.js';

interface ValidateSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

export function validate(schemas: ValidateSchemas): RequestHandler {
  return (req, _res, next) => {
    for (const part of ['body', 'query', 'params'] as const) {
      const schema = schemas[part];
      if (!schema) continue;
      const result = schema.safeParse(req[part]);
      if (!result.success) {
        throw new HttpError(400, 'VALIDATION_ERROR', 'Request validation failed', {
          issues: result.error.issues,
        });
      }
      (req as unknown as Record<string, unknown>)[part] = result.data;
    }
    next();
  };
}
