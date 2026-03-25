import { useSignOutMutation } from "../model/use-sign-out-mutation";
import { useI18n } from "../../../shared/i18n";

type SignOutButtonProps = {
  className?: string;
};

export const SignOutButton = ({ className }: SignOutButtonProps) => {
  const { mutate, isPending } = useSignOutMutation();
  const { t } = useI18n();

  return (
    <button
      type="button"
      className={className}
      onClick={() => mutate()}
      disabled={isPending}
    >
      {isPending ? t("shell.signOutPending") : t("shell.signOut")}
    </button>
  );
};
