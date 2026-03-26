import { Navigate, useLocation } from "react-router-dom";
import { selectIsAuthenticated, useAuthStore } from "../../../shared/model";
import { AuthPanel } from "../../../widgets/auth-panel";

export const AuthPage = () => {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const hashParams = new URLSearchParams(location.hash.replace("#", ""));
  const isRecoveryFlow =
    location.pathname === "/auth/reset-password" ||
    searchParams.get("type") === "recovery" ||
    hashParams.get("type") === "recovery";

  if (isAuthenticated && !isRecoveryFlow) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="layout-center">
      <AuthPanel initialTab={isRecoveryFlow ? "reset-password" : "sign-in"} />
    </main>
  );
};
