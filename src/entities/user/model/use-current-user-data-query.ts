import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../shared/api/query-keys";
import { selectIsAuthenticated, useAuthStore } from "../../../shared/model";
import { getCurrentUserData } from "../api/get-current-user-data";

export const useCurrentUserDataQuery = () => {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  return useQuery({
    queryKey: queryKeys.auth.currentUserData(),
    queryFn: getCurrentUserData,
    enabled: isAuthenticated,
  });
};
