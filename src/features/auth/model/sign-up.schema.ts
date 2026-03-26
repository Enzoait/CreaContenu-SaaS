import { z } from "zod";
import type { MessageKey } from "../../../shared/i18n/messages";

export type AuthTranslate = (key: MessageKey) => string;

export function createSignUpSchema(t: AuthTranslate) {
  return z
    .object({
      firstname: z
        .string()
        .trim()
        .min(1, t("auth.validationFirstNameRequired")),
      lastname: z.string().trim().min(1, t("auth.validationLastNameRequired")),
      phoneNumber: z.string().trim().min(1, t("auth.validationPhoneRequired")),
      country: z.string().trim().min(1, t("auth.validationCountryRequired")),
      region: z.string().trim().min(1, t("auth.validationRegionRequired")),
      email: z.string().email(t("auth.validationEmailInvalid")),
      profilePicture: z.union([
        z.literal(""),
        z.string().url({ message: t("auth.validationUrlInvalid") }),
      ]),
      password: z.string().min(8, t("auth.validationPasswordMin8")),
      confirmPassword: z
        .string()
        .min(8, t("auth.validationConfirmPasswordMin8")),
      acceptTerms: z
        .boolean()
        .refine((value) => value, t("auth.validationAcceptTerms")),
    })
    .refine((data) => data.password === data.confirmPassword, {
      path: ["confirmPassword"],
      message: t("auth.validationPasswordMismatch"),
    });
}

export type SignUpFormValues = z.infer<ReturnType<typeof createSignUpSchema>>;
