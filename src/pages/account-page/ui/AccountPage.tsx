import { UserIdentityCard } from "../../../entities/user";
import { AppHeader } from "../../../widgets/app-header";

export const AccountPage = () => {
  return (
    <main className="layout stack-lg">
      <AppHeader />
      <UserIdentityCard title="Compte" />
      <section className="surface">
        <h3>Demonstration du cache</h3>
        <p>
          Le timestamp affiche la meme valeur immediate quand la donnee vient du
          cache.
        </p>
      </section>
    </main>
  );
};
