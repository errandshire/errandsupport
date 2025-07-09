import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, AuthState } from '@/lib/types';

interface AuthStore extends AuthState {
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      sessionToken: null,

      setUser: (user) => {
        set({ user, isAuthenticated: !!user });
      },

      setLoading: (isLoading) => {
        set({ isLoading });
      },

      setAuthenticated: (isAuthenticated) => {
        set({ isAuthenticated });
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          sessionToken: null,
        });
      },

      updateUser: (updates) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: {
              ...currentUser,
              ...updates,
            },
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        sessionToken: state.sessionToken,
      }),
    }
  )
); 