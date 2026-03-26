import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useI18n } from "../../../shared/i18n";
import {
  createResetPasswordSchema,
  type ResetPasswordFormValues,
} from "../model/reset-password.schema";
import { useResetPasswordMutation } from "../model/use-reset-password-mutation";

type ResetPasswordFormProps = {
  onBackToSignIn?: () => void;
};

export const ResetPasswordForm = ({
  onBackToSignIn,
}: ResetPasswordFormProps) => {
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const { t } = useI18n();
  const resetPasswordSchema = useMemo(
    () => createResetPasswordSchema(t),
    [t],
  );
  const { mutateAsync, isPending, isError, error } = useResetPasswordMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    await mutateAsync(values);
    setHasSubmitted(true);
  };

  return (
    <form className="auth-form" noValidate onSubmit={handleSubmit(onSubmit)}>
      <label className="field-label" htmlFor="reset-password-new">
        {t("auth.fieldNewPassword")}
      </label>
      <input
        id="reset-password-new"
        className="field-input"
        type="password"
        placeholder={t("auth.placeholderPasswordMin8")}
        {...register("newPassword")}
      />
      {errors.newPassword ? (
        <p className="error">{errors.newPassword.message}</p>
      ) : null}

      <label className="field-label" htmlFor="reset-password-confirm">
        {t("auth.fieldConfirmPassword")}
      </label>
      <input
        id="reset-password-confirm"
        className="field-input"
        type="password"
        placeholder={t("auth.placeholderConfirmPassword")}
        {...register("confirmPassword")}
      />
      {errors.confirmPassword ? (
        <p className="error">{errors.confirmPassword.message}</p>
      ) : null}

      <button className="auth-primary" type="submit" disabled={isPending}>
        {isPending ? t("auth.resetSubmitting") : t("auth.resetSubmit")}
      </button>

      {isError ? <p className="error">{error.message}</p> : null}
      {hasSubmitted ? (
        <p className="success">{t("auth.resetSuccessMessage")}</p>
      ) : null}

      <button type="button" className="text-action" onClick={onBackToSignIn}>
        {t("auth.backToSignIn")}
      </button>
    </form>
  );
};
