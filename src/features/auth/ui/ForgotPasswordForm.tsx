import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useI18n } from "../../../shared/i18n";
import {
  createForgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "../model/forgot-password.schema";
import { useRequestPasswordResetMutation } from "../model/use-request-password-reset-mutation";

type ForgotPasswordFormProps = {
  onBackToSignIn?: () => void;
};

export const ForgotPasswordForm = ({
  onBackToSignIn,
}: ForgotPasswordFormProps) => {
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const { t } = useI18n();
  const forgotPasswordSchema = useMemo(
    () => createForgotPasswordSchema(t),
    [t],
  );
  const { mutateAsync, isPending, isError, error } =
    useRequestPasswordResetMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    await mutateAsync(values);
    setHasSubmitted(true);
  };

  return (
    <form className="auth-form" noValidate onSubmit={handleSubmit(onSubmit)}>
      <label className="field-label" htmlFor="forgot-password-email">
        {t("auth.fieldEmail")}
      </label>
      <input
        id="forgot-password-email"
        className="field-input"
        type="email"
        placeholder={t("auth.placeholderEmail")}
        {...register("email")}
      />
      {errors.email ? <p className="error">{errors.email.message}</p> : null}

      <button className="auth-primary" type="submit" disabled={isPending}>
        {isPending ? t("auth.forgotSubmitting") : t("auth.forgotSendLink")}
      </button>

      {isError ? <p className="error">{error.message}</p> : null}
      {hasSubmitted ? (
        <p className="success">{t("auth.forgotSuccessMessage")}</p>
      ) : null}

      <button type="button" className="text-action" onClick={onBackToSignIn}>
        {t("auth.backToSignIn")}
      </button>
    </form>
  );
};
