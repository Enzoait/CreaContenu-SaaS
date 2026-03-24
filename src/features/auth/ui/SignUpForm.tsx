import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { signUpSchema, type SignUpFormValues } from "../model/sign-up.schema";
import { useSignUpMutation } from "../model/use-sign-up-mutation";

export const SignUpForm = () => {
  const navigate = useNavigate();
  const { mutateAsync, isPending, isError, error, data } = useSignUpMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: SignUpFormValues) => {
    const result = await mutateAsync(values);
    if (!result.requiresEmailConfirmation) {
      navigate("/dashboard");
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit(onSubmit)}>
      <label className="field-label" htmlFor="sign-up-email">
        Adresse email
      </label>
      <input
        id="sign-up-email"
        className="field-input"
        type="email"
        placeholder="vous@exemple.com"
        {...register("email")}
      />
      {errors.email ? <p className="error">{errors.email.message}</p> : null}

      <label className="field-label" htmlFor="sign-up-password">
        Mot de passe
      </label>
      <input
        id="sign-up-password"
        className="field-input"
        type="password"
        placeholder="min 8 caracteres"
        {...register("password")}
      />
      {errors.password ? (
        <p className="error">{errors.password.message}</p>
      ) : null}

      <label className="field-label" htmlFor="sign-up-confirm-password">
        Confirmer le mot de passe
      </label>
      <input
        id="sign-up-confirm-password"
        className="field-input"
        type="password"
        placeholder="repetez le mot de passe"
        {...register("confirmPassword")}
      />
      {errors.confirmPassword ? (
        <p className="error">{errors.confirmPassword.message}</p>
      ) : null}

      <label className="checkbox-row">
        <input type="checkbox" />
        <span>J'accepte les conditions et la politique de confidentialite</span>
      </label>

      <button className="auth-primary" type="submit" disabled={isPending}>
        {isPending ? "Inscription en cours..." : "S'inscrire"}
      </button>

      {isError ? <p className="error">{error.message}</p> : null}
      {data?.requiresEmailConfirmation ? (
        <p className="success">
          Verifiez votre email pour activer votre compte.
        </p>
      ) : null}
    </form>
  );
};
