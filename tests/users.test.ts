import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { buildApp } from '../src/app.js';

const { mockVerifyIdToken } = vi.hoisted(() => {
  const mockVerifyIdToken = vi.fn();
  return { mockVerifyIdToken };
});

vi.mock('google-auth-library', () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

const { mockPrismaUser } = vi.hoisted(() => {
  const mockPrismaUser = {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
  return { mockPrismaUser };
});

vi.mock('../src/core/prisma.js', () => ({
  prisma: { user: mockPrismaUser },
}));

const MOCK_GOOGLE_PAYLOAD = {
  sub: 'google-sub-123',
  email: 'test@example.com',
  name: 'Test User',
  picture: 'https://example.com/photo.jpg',
};

const MOCK_USER = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  googleId: 'google-sub-123',
  email: 'test@example.com',
  displayName: 'Test User',
  avatarUrl: 'https://example.com/photo.jpg',
  username: null,
  bio: null,
  phoneNumber: null,
  status: 'PENDING_VERIFICATION',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

function mockValidToken() {
  mockVerifyIdToken.mockResolvedValueOnce({ getPayload: () => MOCK_GOOGLE_PAYLOAD });
}

function mockInvalidToken() {
  mockVerifyIdToken.mockRejectedValueOnce(new Error('Invalid token'));
}

describe('users routes', () => {
  const app = buildApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /users', () => {
    it('returns 401 when Authorization header is missing', async () => {
      const res = await request(app).post('/users');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 401 when Google token is invalid', async () => {
      mockInvalidToken();
      const res = await request(app).post('/users').set('Authorization', 'Bearer bad-token');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 201 and creates user from token claims', async () => {
      mockValidToken();
      mockPrismaUser.findUnique.mockResolvedValueOnce(null);
      mockPrismaUser.create.mockResolvedValueOnce(MOCK_USER);

      const res = await request(app).post('/users').set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: MOCK_USER.id,
        googleId: MOCK_USER.googleId,
        email: MOCK_USER.email,
        displayName: MOCK_USER.displayName,
        status: 'PENDING_VERIFICATION',
      });
      expect(mockPrismaUser.create).toHaveBeenCalledWith({
        data: {
          googleId: MOCK_GOOGLE_PAYLOAD.sub,
          email: MOCK_GOOGLE_PAYLOAD.email,
          displayName: MOCK_GOOGLE_PAYLOAD.name,
          avatarUrl: MOCK_GOOGLE_PAYLOAD.picture,
        },
      });
    });

    it('returns 409 when user already exists', async () => {
      mockValidToken();
      mockPrismaUser.findUnique.mockResolvedValueOnce(MOCK_USER);

      const res = await request(app).post('/users').set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('USER_ALREADY_EXISTS');
    });
  });

  describe('GET /users/:googleId', () => {
    it('returns 401 when Authorization header is missing', async () => {
      const res = await request(app).get('/users/google-sub-123');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 200 with full user when found', async () => {
      mockValidToken();
      mockPrismaUser.findUnique.mockResolvedValueOnce(MOCK_USER);

      const res = await request(app)
        .get('/users/google-sub-123')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: MOCK_USER.id,
        googleId: MOCK_USER.googleId,
        email: MOCK_USER.email,
        status: 'PENDING_VERIFICATION',
      });
    });

    it('returns 200 with ACTIVE status when user is active', async () => {
      mockValidToken();
      mockPrismaUser.findUnique.mockResolvedValueOnce({ ...MOCK_USER, status: 'ACTIVE' });

      const res = await request(app)
        .get('/users/google-sub-123')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ACTIVE');
    });

    it('returns 404 when user is not found', async () => {
      mockValidToken();
      mockPrismaUser.findUnique.mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/users/google-sub-123')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('PATCH /users/:id', () => {
    const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

    it('returns 401 when Authorization header is missing', async () => {
      const res = await request(app).patch(`/users/${USER_ID}`).send({ displayName: 'New Name' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 200 with updated user when request is valid', async () => {
      mockValidToken();
      mockPrismaUser.findUnique.mockResolvedValueOnce(MOCK_USER);
      const updated = { ...MOCK_USER, username: 'testuser', bio: 'Hello world' };
      mockPrismaUser.update.mockResolvedValueOnce(updated);

      const res = await request(app)
        .patch(`/users/${USER_ID}`)
        .set('Authorization', 'Bearer valid-token')
        .send({ username: 'testuser', bio: 'Hello world' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ username: 'testuser', bio: 'Hello world' });
    });

    it('returns 403 when token user does not own the account', async () => {
      mockValidToken();
      mockPrismaUser.findUnique.mockResolvedValueOnce({
        ...MOCK_USER,
        googleId: 'different-google-id',
      });

      const res = await request(app)
        .patch(`/users/${USER_ID}`)
        .set('Authorization', 'Bearer valid-token')
        .send({ displayName: 'New Name' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 404 when user is not found', async () => {
      mockValidToken();
      mockPrismaUser.findUnique.mockResolvedValueOnce(null);

      const res = await request(app)
        .patch(`/users/${USER_ID}`)
        .set('Authorization', 'Bearer valid-token')
        .send({ displayName: 'New Name' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('USER_NOT_FOUND');
    });

    it('returns 400 when request body is empty', async () => {
      mockValidToken();

      const res = await request(app)
        .patch(`/users/${USER_ID}`)
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when username fails validation', async () => {
      mockValidToken();

      const res = await request(app)
        .patch(`/users/${USER_ID}`)
        .set('Authorization', 'Bearer valid-token')
        .send({ username: 'a!' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
