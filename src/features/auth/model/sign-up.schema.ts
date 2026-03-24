import { z } from "zod";

export const signUpSchema = z
  .object({
    email: z.string().email("Email invalide"),
    password: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caracteres"),
    confirmPassword: z
      .string()
      .min(8, "La confirmation doit contenir au moins 8 caracteres"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Les mots de passe ne correspondent pas",
  });

export type SignUpFormValues = z.infer<typeof signUpSchema>;
