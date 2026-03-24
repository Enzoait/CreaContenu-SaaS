export const queryKeys = {
  auth: {
    root: ["auth"] as const,
    currentUser: () => ["auth", "current-user"] as const,
    currentUserData: () => ["auth", "current-user-data"] as const,
  },
};
