import { Router } from 'express';
import { requireGoogleAuth } from '../../core/auth.js';
import { HttpError } from '../../core/errors.js';
import { prisma } from '../../core/prisma.js';
import { validate } from '../../core/validate.js';
import { googleIdParamsSchema, patchUserBodySchema, userIdParamsSchema } from './schema.js';

export function createUsersRouter(): Router {
  const router = Router();

  router.post('/', requireGoogleAuth, async (req, res) => {
    const { sub: googleId, email, name, picture } = req.googleUser;

    const existing = await prisma.user.findUnique({ where: { googleId } });
    if (existing) {
      throw new HttpError(409, 'USER_ALREADY_EXISTS', 'User already exists');
    }

    const user = await prisma.user.create({
      data: {
        googleId,
        email: email!,
        displayName: name ?? email!,
        avatarUrl: picture ?? null,
      },
    });

    res.status(201).json(user);
  });

  router.get(
    '/:googleId',
    requireGoogleAuth,
    validate({ params: googleIdParamsSchema }),
    async (req, res) => {
      const googleId = req.params['googleId'] as string;
      const user = await prisma.user.findUnique({ where: { googleId } });
      if (!user) {
        throw new HttpError(404, 'USER_NOT_FOUND', 'User not found');
      }
      res.json(user);
    },
  );

  router.patch(
    '/:id',
    requireGoogleAuth,
    validate({ params: userIdParamsSchema, body: patchUserBodySchema }),
    async (req, res) => {
      const id = req.params['id'] as string;
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        throw new HttpError(404, 'USER_NOT_FOUND', 'User not found');
      }
      if (user.googleId !== req.googleUser.sub) {
        throw new HttpError(403, 'FORBIDDEN', 'You can only update your own account');
      }
      const updated = await prisma.user.update({ where: { id }, data: req.body });
      res.json(updated);
    },
  );

  return router;
}
