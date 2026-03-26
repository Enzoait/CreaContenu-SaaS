import { useMutation } from "@tanstack/react-query";
import { requestPasswordReset } from "../api/auth-api";

export const useRequestPasswordResetMutation = () =>
  useMutation({
    mutationFn: requestPasswordReset,
  });
