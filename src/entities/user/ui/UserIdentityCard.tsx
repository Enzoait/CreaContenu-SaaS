import { useCurrentUserQuery } from "../model/use-current-user-query";

type UserIdentityCardProps = {
  title: string;
};

export const UserIdentityCard = ({ title }: UserIdentityCardProps) => {
  const { data, isPending, isError, error, dataUpdatedAt } =
    useCurrentUserQuery();

  if (isPending) {
    return <p>Chargement du profil...</p>;
  }

  if (isError) {
    return <p>Erreur profil: {error.message}</p>;
  }

  return (
    <section className="surface">
      <h2>{title}</h2>
      <p>
        Utilisateur: <strong>{data?.email ?? "Aucun email"}</strong>
      </p>
      <p>ID: {data?.id ?? "Aucun utilisateur connecté"}</p>
      <p>Horodatage du cache: {new Date(dataUpdatedAt).toLocaleTimeString()}</p>
    </section>
  );
};
