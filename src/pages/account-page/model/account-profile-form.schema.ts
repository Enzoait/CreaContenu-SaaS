import { z } from "zod";
import type { MessageKey } from "../../../shared/i18n/messages";

type TFn = (key: MessageKey) => string;

export function createAccountProfileFormSchema(t: TFn) {
  return z.object({
    firstname: z
      .string()
      .trim()
      .min(1, t("account.validationFirstnameRequired")),
    lastname: z
      .string()
      .trim()
      .min(1, t("account.validationLastnameRequired")),
    email: z.string().trim().email(t("account.validationEmailInvalid")),
    phoneNumber: z
      .string()
      .trim()
      .min(1, t("account.validationPhoneRequired")),
    country: z
      .string()
      .trim()
      .min(1, t("account.validationCountryRequired")),
    region: z
      .string()
      .trim()
      .min(1, t("account.validationRegionRequired")),
    profilePicture: z
      .string()
      .trim()
      .refine(
        (val) => val === "" || z.string().url().safeParse(val).success,
        t("account.validationUrlInvalid"),
      ),
  });
}

export type AccountProfileFormValues = z.infer<
  ReturnType<typeof createAccountProfileFormSchema>
>;
