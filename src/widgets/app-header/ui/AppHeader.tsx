import { Link } from "react-router-dom";
import { SignOutButton } from "../../../features/auth";
import { selectAuthUser, useAuthStore } from "../../../shared/model";

export const AppHeader = () => {
  const user = useAuthStore(selectAuthUser);

  return (
    <header className="header surface">
      <div>
        <strong>CreaContenu</strong>
        <p className="muted">{user?.email ?? "Utilisateur"}</p>
      </div>
      <nav className="row">
        <Link to="/dashboard">Tableau de bord</Link>
        <Link to="/account">Compte</Link>
      </nav>
      <SignOutButton />
    </header>
  );
};
