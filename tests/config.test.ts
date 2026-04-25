import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('config validation', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('exits when UNIVERSE is missing', async () => {
    vi.stubEnv('UNIVERSE', '');
    vi.stubEnv('SERVICE_NAME', 'test-service');
    vi.stubEnv('NODE_ENV', 'test');

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    await import('../src/core/config.js');

    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
