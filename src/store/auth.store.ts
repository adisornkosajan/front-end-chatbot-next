import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type AuthState = {
  token: string | null;
  user: any | null;
  originalToken: string | null;
  originalUser: any | null;
  isImpersonating: boolean;
  impersonationContext: {
    organizationName?: string;
    targetUserEmail?: string;
  } | null;
  isHydrated: boolean;
  setToken: (token: string) => void;
  setUser: (user: any) => void;
  startImpersonation: (params: {
    impersonationToken: string;
    impersonatedUser: any;
    organizationName?: string;
    targetUserEmail?: string;
  }) => void;
  stopImpersonation: () => void;
  logout: () => void;
  setHydrated: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      originalToken: null,
      originalUser: null,
      isImpersonating: false,
      impersonationContext: null,
      isHydrated: false,
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      startImpersonation: ({
        impersonationToken,
        impersonatedUser,
        organizationName,
        targetUserEmail,
      }) =>
        set((state) => ({
          originalToken: state.originalToken || state.token,
          originalUser: state.originalUser || state.user,
          token: impersonationToken,
          user: impersonatedUser,
          isImpersonating: true,
          impersonationContext: {
            organizationName,
            targetUserEmail,
          },
        })),
      stopImpersonation: () =>
        set((state) => {
          if (!state.isImpersonating || !state.originalToken || !state.originalUser) {
            return state;
          }
          return {
            token: state.originalToken,
            user: state.originalUser,
            originalToken: null,
            originalUser: null,
            isImpersonating: false,
            impersonationContext: null,
          };
        }),
      logout: () => {
        set({
          token: null,
          user: null,
          originalToken: null,
          originalUser: null,
          isImpersonating: false,
          impersonationContext: null,
        });
        // Clear localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-storage');
        }
      },
      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        // Mark as hydrated when rehydration is complete
        state?.setHydrated();
      },
    },
  ),
);
