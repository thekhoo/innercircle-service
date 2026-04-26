import type { RequestHandler } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { config } from './config.js';
import { HttpError } from './errors.js';

const client = new OAuth2Client(config.GOOGLE_CLIENT_ID);

export const requireGoogleAuth: RequestHandler = async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Missing or invalid Authorization header');
  }

  const token = authHeader.slice(7);
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: config.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email) {
      throw new HttpError(401, 'UNAUTHORIZED', 'Invalid token payload');
    }

    req.googleUser = payload;
    next();
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(401, 'UNAUTHORIZED', 'Token verification failed');
  }
};
