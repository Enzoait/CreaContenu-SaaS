import { useMutation } from "@tanstack/react-query";
import { changePassword } from "../api/auth-api";

export const useChangePasswordMutation = () =>
  useMutation({
    mutationFn: changePassword,
  });
