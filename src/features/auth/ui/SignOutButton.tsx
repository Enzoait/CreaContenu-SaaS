import { useSignOutMutation } from "../model/use-sign-out-mutation";

export const SignOutButton = () => {
  const { mutate, isPending } = useSignOutMutation();

  return (
    <button type="button" onClick={() => mutate()} disabled={isPending}>
      {isPending ? "Deconnexion..." : "Se deconnecter"}
    </button>
  );
};
