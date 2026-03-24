import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caracteres"),
});

export type SignInFormValues = z.infer<typeof signInSchema>;
