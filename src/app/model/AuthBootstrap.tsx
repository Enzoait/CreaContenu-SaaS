import { useEffect, type ReactNode } from "react";
import { queryClient } from "../../shared/api/query-client";
import { queryKeys } from "../../shared/api/query-keys";
import { supabase } from "../../shared/api/supabase/client";
import { useAuthStore } from "../../shared/model";
import { mapSupabaseUserToUserModel } from "../../entities/user";

type AuthBootstrapProps = {
  children: ReactNode;
};

export const AuthBootstrap = ({ children }: AuthBootstrapProps) => {
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session || !session.user) {
        clearSession();
        queryClient.removeQueries({ queryKey: queryKeys.auth.root });
        return;
      }

      const user = mapSupabaseUserToUserModel(session.user);
      setSession({ accessToken: session.access_token, user });
      queryClient.setQueryData(queryKeys.auth.currentUser(), user);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [clearSession, setSession]);

  return <>{children}</>;
};
