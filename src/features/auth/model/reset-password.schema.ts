import { z } from "zod";
import type { MessageKey } from "../../../shared/i18n/messages";

export type AuthTranslate = (key: MessageKey) => string;

export function createResetPasswordSchema(t: AuthTranslate) {
  return z
    .object({
      newPassword: z
        .string()
        .min(8, t("auth.validationNewPasswordMin8")),
      confirmPassword: z
        .string()
        .min(8, t("auth.validationConfirmPasswordMin8")),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      path: ["confirmPassword"],
      message: t("auth.validationPasswordMismatch"),
    });
}

export type ResetPasswordFormValues = z.infer<
  ReturnType<typeof createResetPasswordSchema>
>;
