import { UserIdentityCard } from "../../../entities/user";
import { AppHeader } from "../../../widgets/app-header";

export const DashboardPage = () => {
  return (
    <main className="layout stack-lg">
      <AppHeader />
      <UserIdentityCard title="Tableau de bord" />
      <section className="surface">
        <h3>Cache React Query</h3>
        <p>
          Naviguez vers la page Compte puis revenez: le profil utilisateur reste
          en cache (queryKey stable + staleTime).
        </p>
      </section>
    </main>
  );
};
