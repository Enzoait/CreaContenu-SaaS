import { z } from "zod";

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(8, "Le mot de passe actuel doit contenir au moins 8 caracteres"),
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
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    path: ["newPassword"],
    message: "Le nouveau mot de passe doit etre different de l'actuel",
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
