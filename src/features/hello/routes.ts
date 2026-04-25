import { Router } from 'express';
import { validate } from '../../core/validate.js';
import { helloParamsSchema } from './schema.js';

export function createHelloRouter(): Router {
  const router = Router();

  router.get('/world', (_req, res) => {
    res.json({ message: 'Hello, world!' });
  });

  router.get('/:name', validate({ params: helloParamsSchema }), (req, res) => {
    res.json({ message: `Hello, ${req.params.name}!` });
  });

  return router;
}
