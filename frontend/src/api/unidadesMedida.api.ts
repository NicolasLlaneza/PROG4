import { apiClient } from "./client";
import type { UnidadMedida } from "../types";

export const unidadesMedidaApi = {
  async listar(): Promise<UnidadMedida[]> {
    const res = await apiClient.get<{ items: UnidadMedida[] }>("/unidades-medida/", {
      params: { offset: 0, limit: 100 },
    });
    return res.data.items;
  },
};
