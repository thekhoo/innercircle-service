import { Router } from 'express';
import { config } from '../../core/config.js';

export function createHealthRouter(): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json({
      status: 'ok',
      service: config.SERVICE_NAME,
      universe: config.UNIVERSE,
      uptime: process.uptime(),
    });
  });

  return router;
}
