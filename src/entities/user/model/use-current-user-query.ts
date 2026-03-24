import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../shared/api/query-keys";
import { selectIsAuthenticated, useAuthStore } from "../../../shared/model";
import { getCurrentUser } from "../api/get-current-user";

export const useCurrentUserQuery = () => {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  return useQuery({
    queryKey: queryKeys.auth.currentUser(),
    queryFn: getCurrentUser,
    enabled: isAuthenticated,
  });
};
