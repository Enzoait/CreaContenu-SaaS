import { Navigate, Route, Routes } from "react-router-dom";
import { AccountPage, AuthPage, DashboardPage } from "../../pages";
import { selectIsAuthenticated, useAuthStore } from "../../shared/model";
import { ProtectedRoute } from "./ProtectedRoute";

export const AppRouter = () => {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/account"
        element={
          <ProtectedRoute>
            <AccountPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="*"
        element={
          <Navigate to={isAuthenticated ? "/dashboard" : "/auth"} replace />
        }
      />
    </Routes>
  );
};
