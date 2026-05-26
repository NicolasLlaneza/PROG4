import axios from "axios";
import { useAuthStore } from "../stores/authStore";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
    public title?: string
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

// Alias for backward-compat with code that checks `instanceof HttpError`
export const HttpError = ApiError;

function toCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function convertToCamel(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(convertToCamel);
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        toCamel(k),
        convertToCamel(v),
      ])
    );
  }
  return obj;
}

function toSnake(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

function convertToSnake(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(convertToSnake);
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        toSnake(k),
        convertToSnake(v),
      ])
    );
  }
  return obj;
}

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// camelCase → snake_case for request bodies
apiClient.interceptors.request.use((config) => {
  if (config.data && typeof config.data === "object") {
    config.data = convertToSnake(config.data);
  }
  return config;
});

// snake_case → camelCase for responses + 401 handling
apiClient.interceptors.response.use(
  (res) => {
    res.data = convertToCamel(res.data);
    return res;
  },
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    const raw = error.response?.data ?? null;
    const converted = raw ? (convertToCamel(raw) as Record<string, unknown>) : null;
    const detail =
      (converted?.detail as string) ??
      (converted?.message as string) ??
      error.message ??
      "Error desconocido";
    const status = error.response?.status ?? 0;
    return Promise.reject(new ApiError(status, detail));
  }
);
