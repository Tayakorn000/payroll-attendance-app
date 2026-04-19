import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthState } from "../types";

interface AuthStore extends AuthState {
  setAuth: (token: string, role: string, employeeId: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      role: null,
      employeeId: null,
      setAuth: (token, role, employeeId) =>
        set({ token, role: role as "admin" | "employee", employeeId }),
      logout: () => {
        localStorage.removeItem("token");
        set({ token: null, role: null, employeeId: null });
      },
    }),
    { name: "auth-store" }
  )
);
