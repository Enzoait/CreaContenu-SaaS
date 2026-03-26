import { z } from "zod";
import type { MessageKey } from "../../../shared/i18n/messages";

export type AuthTranslate = (key: MessageKey) => string;

export function createForgotPasswordSchema(t: AuthTranslate) {
  return z.object({
    email: z.string().email(t("auth.validationEmailInvalid")),
  });
}

export type ForgotPasswordFormValues = z.infer<
  ReturnType<typeof createForgotPasswordSchema>
>;
