import { z } from "zod";

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email invalide"),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
