import { z } from "zod";
import type { MessageKey } from "../../../shared/i18n/messages";

type TFn = (key: MessageKey) => string;

export function createChangePasswordSchema(t: TFn) {
  return z
    .object({
      currentPassword: z
        .string()
        .min(8, t("account.validationCurrentPasswordMin8")),
      newPassword: z.string().min(8, t("account.validationNewPasswordMin8")),
      confirmPassword: z
        .string()
        .min(8, t("account.validationConfirmPasswordMin8")),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      path: ["confirmPassword"],
      message: t("account.validationPasswordMismatch"),
    })
    .refine((data) => data.currentPassword !== data.newPassword, {
      path: ["newPassword"],
      message: t("account.validationPasswordNewMustDiffer"),
    });
}

export type ChangePasswordFormValues = z.infer<
  ReturnType<typeof createChangePasswordSchema>
>;
