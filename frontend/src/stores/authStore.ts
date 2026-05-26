import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { RolNombre, Usuario } from "../types";

interface AuthState {
  user: Usuario | null;
  // kept as null so existing !!s.accessToken checks don't break (update callers to use !!s.user)
  accessToken: null;
  login: (user: Usuario) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  hasRole: (rol: RolNombre) => boolean;
  hasAnyRole: (roles: RolNombre[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,

      login: (user) => set({ user }),
      logout: () => set({ user: null }),
      isAuthenticated: () => !!get().user,
      hasRole: (rol) => !!get().user?.roles.includes(rol),
      hasAnyRole: (roles) => !!get().user?.roles.some((r) => roles.includes(r)),
    }),
    {
      name: "food-store-auth-v2",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user }),
    }
  )
);
