import { apiClient } from "./client";
import type { LoginRequest, LoginResponse, RegisterRequest, RolNombre, Usuario } from "../types";

function adaptUser(raw: Record<string, unknown>): Usuario {
  return {
    id: raw.id as number,
    nombre: raw.nombre as string,
    apellido: (raw.apellido as string) ?? "",
    email: raw.email as string,
    celular: (raw.celular as string | null) ?? null,
    roles: ((raw.roles as string[]) ?? []) as RolNombre[],
    creadoEn: (raw.createdAt as string) ?? new Date().toISOString(),
    actualizadoEn:
      (raw.updatedAt as string) ?? (raw.createdAt as string) ?? new Date().toISOString(),
    eliminadoEn: (raw.deletedAt as string | null) ?? null,
  };
}

export const authApi = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const res = await apiClient.post<Record<string, unknown>>("/auth/login", data);
    const raw = res.data;
    const user = adaptUser(raw.user as Record<string, unknown>);
    return { user };
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // silently ignore — cookie is cleared server-side or already expired
    }
  },

  async registro(data: RegisterRequest): Promise<LoginResponse> {
    // POST /auth/registro returns UsuarioPublic only; auto-login afterward
    await apiClient.post("/auth/registro", data);
    const loginRes = await apiClient.post<Record<string, unknown>>("/auth/login", {
      email: data.email,
      password: data.password,
    });
    const user = adaptUser(loginRes.data.user as Record<string, unknown>);
    return { user };
  },

  async me(): Promise<Usuario> {
    const res = await apiClient.get<Record<string, unknown>>("/auth/me");
    return adaptUser(res.data);
  },
};
