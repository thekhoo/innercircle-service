import { z } from 'zod';

export const googleIdParamsSchema = z.object({
  googleId: z.string().min(1),
});

export const userIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const patchUserBodySchema = z
  .object({
    displayName: z.string().min(1).max(100).optional(),
    avatarUrl: z.string().min(1).optional(),
    username: z
      .string()
      .min(3)
      .max(30)
      .regex(/^[a-zA-Z0-9_]+$/)
      .optional(),
    bio: z.string().max(500).optional(),
    phoneNumber: z.string().min(7).max(20).optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'At least one field must be provided',
  });

export type GoogleIdParams = z.infer<typeof googleIdParamsSchema>;
export type UserIdParams = z.infer<typeof userIdParamsSchema>;
export type PatchUserBody = z.infer<typeof patchUserBodySchema>;
