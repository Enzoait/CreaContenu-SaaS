import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../shared/api/query-keys";
import { useAuthStore } from "../../../shared/model";
import { signInWithPassword } from "../api/auth-api";

export const useSignInMutation = () => {
  const setSession = useAuthStore((state) => state.setSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signInWithPassword,
    onSuccess: (session) => {
      setSession(session);
      queryClient.setQueryData(queryKeys.auth.currentUser(), session.user);
      queryClient.invalidateQueries({
        queryKey: queryKeys.auth.currentUserData(),
      });
    },
  });
};
