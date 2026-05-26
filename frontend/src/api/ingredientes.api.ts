import { apiClient } from "./client";
import type { FiltrosIngredientes, Ingrediente, Paginado } from "../types";

type IngredienteFormData = Omit<Ingrediente, "id" | "creadoEn" | "actualizadoEn" | "eliminadoEn">;

function adaptIngrediente(raw: Record<string, unknown>): Ingrediente {
  return {
    id: raw.id as number,
    nombre: raw.nombre as string,
    descripcion: (raw.descripcion as string | null) ?? null,
    esAlergeno: (raw.esAlergeno as boolean) ?? false,
    stockDisponible: (raw.stockCantidad as number) ?? 0,
    costoUnitario: (raw.precioPorUnidad as number) ?? 0,
    unidadMedidaId: (raw.unidadMedidaId as number) ?? 1,
    creadoEn: (raw.createdAt as string) ?? new Date().toISOString(),
    actualizadoEn:
      (raw.updatedAt as string) ?? (raw.createdAt as string) ?? new Date().toISOString(),
    eliminadoEn: (raw.deletedAt as string | null) ?? null,
  };
}

// Backend field names differ from frontend — send pre-formatted snake_case
// so the camelCase→snake_case interceptor doesn't mistranslate them.
function toBackend(data: Partial<IngredienteFormData>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (data.nombre !== undefined) out.nombre = data.nombre;
  if (data.descripcion !== undefined) out.descripcion = data.descripcion;
  if (data.esAlergeno !== undefined) out.es_alergeno = data.esAlergeno;
  if (data.stockDisponible !== undefined) out.stock_cantidad = data.stockDisponible;
  if (data.costoUnitario !== undefined) out.precio_por_unidad = data.costoUnitario;
  return out;
}

export const ingredientesApi = {
  async listar(filtros: FiltrosIngredientes = {}): Promise<Paginado<Ingrediente>> {
    const res = await apiClient.get<Record<string, unknown>>("/admin/insumos/", {
      params: {
        offset: filtros.skip ?? 0,
        limit: filtros.limit ?? 50,
      },
    });
    const raw = res.data as { items: Record<string, unknown>[]; total: number; skip: number; limit: number };
    return {
      items: raw.items.map(adaptIngrediente),
      total: raw.total,
      skip: raw.skip,
      limit: raw.limit,
    };
  },

  async crear(data: IngredienteFormData): Promise<Ingrediente> {
    const res = await apiClient.post<Record<string, unknown>>("/admin/insumos/", toBackend(data));
    return adaptIngrediente(res.data);
  },

  async editar(
    id: number,
    data: Partial<IngredienteFormData>
  ): Promise<Ingrediente> {
    const res = await apiClient.patch<Record<string, unknown>>(
      `/admin/insumos/${id}`,
      toBackend(data)
    );
    return adaptIngrediente(res.data);
  },

  async eliminar(id: number): Promise<void> {
    await apiClient.delete(`/admin/insumos/${id}`);
  },

  async reactivar(id: number): Promise<Ingrediente> {
    const res = await apiClient.post<Record<string, unknown>>(
      `/admin/insumos/${id}/reactivar`
    );
    return adaptIngrediente(res.data);
  },
};
