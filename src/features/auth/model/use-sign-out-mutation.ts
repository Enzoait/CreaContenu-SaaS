import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../shared/api/query-keys";
import { useAuthStore } from "../../../shared/model";
import { signOut } from "../api/auth-api";

export const useSignOutMutation = () => {
  const clearSession = useAuthStore((state) => state.clearSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signOut,
    onSuccess: () => {
      clearSession();
      queryClient.removeQueries({ queryKey: queryKeys.auth.root });
    },
  });
};
