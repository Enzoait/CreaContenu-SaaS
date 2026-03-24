import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { selectIsAuthenticated, useAuthStore } from "../../shared/model";

type ProtectedRouteProps = {
  children: ReactNode;
};

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};
