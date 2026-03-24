import type { User } from "@supabase/supabase-js";
import { z } from "zod";

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().nullable(),
  createdAt: z.string().datetime({ offset: true }),
});

export type UserModel = z.infer<typeof userSchema>;

export const mapSupabaseUserToUserModel = (user: User): UserModel =>
  userSchema.parse({
    id: user.id,
    email: user.email ?? null,
    createdAt: user.created_at,
  });
