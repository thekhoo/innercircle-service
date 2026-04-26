import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(0).default(3002),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  SERVICE_NAME: z.string().min(1),
  UNIVERSE: z.enum(['development', 'staging', 'production']),
  CORS_ORIGINS: z.string().default('*'),
  DATABASE_URL: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
});

const result = schema.safeParse(process.env);

if (!result.success) {
  process.stderr.write(
    `Config validation failed:\n${JSON.stringify(result.error.issues, null, 2)}\n`,
  );
  process.exit(1);
}

export type Config = z.infer<typeof schema>;

export const config: Readonly<Config> = Object.freeze(result.data);
