import { Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import {
  AccountPage,
  AuthPage,
  DashboardPage,
  VideosPage,
  VideosPageQueryErrorFallback,
} from "../../pages";
import { selectIsAuthenticated, useAuthStore } from "../../shared/model";
import { AnimatedLoader } from "../../shared/ui/AnimatedLoader";
import { QueryRouteErrorBoundary } from "../../shared/ui/QueryRouteErrorBoundary";
import { ProtectedRoute } from "./ProtectedRoute";

export const AppRouter = () => {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/auth/reset-password" element={<AuthPage />} />
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
        path="/videos"
        element={
          <ProtectedRoute>
            <QueryRouteErrorBoundary
              fallbackRender={({ error, onRetry }) => (
                <VideosPageQueryErrorFallback error={error} onRetry={onRetry} />
              )}
            >
              <Suspense fallback={<AnimatedLoader />}>
                <VideosPage />
              </Suspense>
            </QueryRouteErrorBoundary>
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
