import { z } from "zod";

export const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Le nouveau mot de passe doit contenir au moins 8 caracteres"),
    confirmPassword: z
      .string()
      .min(8, "La confirmation doit contenir au moins 8 caracteres"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Les mots de passe ne correspondent pas",
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
