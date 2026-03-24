import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../shared/api/query-keys";
import { useAuthStore } from "../../../shared/model";
import { signUpWithEmail } from "../api/auth-api";

export const useSignUpMutation = () => {
  const setSession = useAuthStore((state) => state.setSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signUpWithEmail,
    onSuccess: (result) => {
      if (!result.session) {
        return;
      }

      setSession(result.session);
      queryClient.setQueryData(
        queryKeys.auth.currentUser(),
        result.session.user,
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.auth.currentUserData(),
      });
    },
  });
};
