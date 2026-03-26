import { z } from "zod";
import type { MessageKey } from "../../../shared/i18n/messages";

export type AuthTranslate = (key: MessageKey) => string;

export function createSignInSchema(t: AuthTranslate) {
  return z.object({
    email: z.string().email(t("auth.validationEmailInvalid")),
    password: z.string().min(8, t("auth.validationPasswordMin8")),
    acceptTerms: z
      .boolean()
      .refine((value) => value, t("auth.validationAcceptTerms")),
  });
}

export type SignInFormValues = z.infer<ReturnType<typeof createSignInSchema>>;
