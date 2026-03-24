import { useSignOutMutation } from "../model/use-sign-out-mutation";

type SignOutButtonProps = {
  className?: string;
};

export const SignOutButton = ({ className }: SignOutButtonProps) => {
  const { mutate, isPending } = useSignOutMutation();

  return (
    <button
      type="button"
      className={className}
      onClick={() => mutate()}
      disabled={isPending}
    >
      {isPending ? "Déconnexion…" : "Déconnexion"}
    </button>
  );
};
