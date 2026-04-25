import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildApp } from '../src/app.js';

describe('hello routes', () => {
  const app = buildApp();

  it('GET /hello/world returns Hello, world!', async () => {
    const res = await request(app).get('/hello/world');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Hello, world!' });
  });

  it('GET /hello/Ada returns Hello, Ada!', async () => {
    const res = await request(app).get('/hello/Ada');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Hello, Ada!' });
  });

  it('GET /hello/bad-name! returns 400 VALIDATION_ERROR', async () => {
    const res = await request(app).get('/hello/bad-name!');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /does-not-exist returns 404 NOT_FOUND', async () => {
    const res = await request(app).get('/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
