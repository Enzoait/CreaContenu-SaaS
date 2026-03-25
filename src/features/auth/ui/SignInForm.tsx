import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { signInSchema, type SignInFormValues } from "../model/sign-in.schema";
import { useSignInMutation } from "../model/use-sign-in-mutation";

export const SignInForm = () => {
  const navigate = useNavigate();
  const { mutateAsync, isPending, isError, error } = useSignInMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: SignInFormValues) => {
    await mutateAsync(values);
    navigate("/dashboard");
  };

  return (
    <form
      className="auth-form"
      noValidate
      onSubmit={handleSubmit(onSubmit)}
    >
      <label className="field-label" htmlFor="sign-in-email">
        Adresse email
      </label>
      <input
        id="sign-in-email"
        className="field-input"
        type="email"
        placeholder="vous@exemple.com"
        {...register("email")}
      />
      {errors.email ? <p className="error">{errors.email.message}</p> : null}

      <div className="row-between">
        <label className="field-label" htmlFor="sign-in-password">
          Mot de passe
        </label>
        <button type="button" className="text-action" tabIndex={-1}>
          Mot de passe oublie ?
        </button>
      </div>
      <input
        id="sign-in-password"
        className="field-input"
        type="password"
        placeholder="min 8 caracteres"
        {...register("password")}
      />
      {errors.password ? (
        <p className="error">{errors.password.message}</p>
      ) : null}

      <label className="checkbox-row">
        <input type="checkbox" />
        <span>J'accepte les conditions et la politique de confidentialite</span>
      </label>

      <button className="auth-primary" type="submit" disabled={isPending}>
        {isPending ? "Connexion en cours..." : "Se connecter"}
      </button>

      {isError ? <p className="error">{error.message}</p> : null}
    </form>
  );
};
