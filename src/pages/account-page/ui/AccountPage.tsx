import { UserIdentityCard } from "../../../entities/user";
import { ProfileSettingsForm } from "../../../features/account-profile";
import { CreatorAppShell } from "../../../widgets/creator-app-shell";

export const AccountPage = () => {
  return (
    <CreatorAppShell accountTopBar>
      <div className="layout stack-lg">
        <UserIdentityCard title="Compte — Session Supabase" />
        <ProfileSettingsForm />
        <section className="surface">
          <h3>Démonstration du cache React Query</h3>
          <p>
            L&apos;horodatage dans la carte ci-dessus reste identique quand les
            données viennent du cache (même requête utilisateur).
          </p>
        </section>
      </div>
    </CreatorAppShell>
  );
};