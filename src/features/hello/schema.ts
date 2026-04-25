import { z } from 'zod';

export const helloParamsSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9]+$/),
});

export type HelloParams = z.infer<typeof helloParamsSchema>;
