export const queryKeys = {
  auth: {
    root: ["auth"] as const,
    currentUser: () => ["auth", "current-user"] as const,
  },
};
