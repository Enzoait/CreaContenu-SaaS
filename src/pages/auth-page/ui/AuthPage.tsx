import { Navigate } from "react-router-dom";
import { selectIsAuthenticated, useAuthStore } from "../../../shared/model";
import { AuthPanel } from "../../../widgets/auth-panel";

export const AuthPage = () => {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="layout-center">
      <AuthPanel />
    </main>
  );
};
