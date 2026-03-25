import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../shared/api/query-keys";
import { upsertUserData } from "../api/upsert-user-data";

export const useUpsertUserDataMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: upsertUserData,
    onSuccess: (userData) => {
      queryClient.setQueryData(queryKeys.auth.currentUserData(), userData);
      queryClient.invalidateQueries({
        queryKey: queryKeys.auth.currentUserData(),
      });
    },
  });
};
