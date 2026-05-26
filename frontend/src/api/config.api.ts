// API de configuracion de precios (costos operativos + margen de ganancia).
// Solo accesible para ADMIN.
// TODO backend: GET/PATCH /api/v1/admin/config/precios

import { mockConfig } from "./mockServer";
import type { ConfigPrecio } from "../types";
import { useAuthStore } from "../stores/authStore";

function tokenActual() {
  return useAuthStore.getState().accessToken;
}

export const configApi = {
  obtener(): Promise<ConfigPrecio> {
    return mockConfig.obtener(tokenActual());
    // BACKEND: return apiClient.get('/admin/config/precios')
  },
  actualizar(data: Partial<ConfigPrecio>): Promise<ConfigPrecio> {
    return mockConfig.actualizar(tokenActual(), data);
    // BACKEND: return apiClient.patch('/admin/config/precios', data)
  },
};
