import { apiClient } from "./client";
import type { Categoria } from "../types";

function adaptCategoria(raw: Record<string, unknown>): Categoria {
  return {
    id: raw.id as number,
    nombre: raw.nombre as string,
    descripcion: (raw.descripcion as string | null) ?? null,
    imagenUrl: (raw.imagenUrl as string | null) ?? null,
    // backend uses parentId (from parent_id), frontend expects padreId
    padreId: (raw.parentId as number | null) ?? null,
    eliminadoEn: (raw.deletedAt as string | null) ?? null,
  };
}

export const categoriasApi = {
  async listar(): Promise<Categoria[]> {
    const res = await apiClient.get<{ items: Record<string, unknown>[] }>("/categorias/", {
      params: { offset: 0, limit: 100 },
    });
    return res.data.items.map(adaptCategoria);
  },
};
