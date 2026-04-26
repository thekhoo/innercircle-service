import type { TokenPayload } from 'google-auth-library';

declare global {
  namespace Express {
    interface Request {
      id: string;
      googleUser: TokenPayload;
    }
  }
}

export {};
