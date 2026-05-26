import { apiClient } from "./client";
import type { FiltrosProductos, Paginado, Producto, ProductoFormData } from "../types";

function adaptProducto(raw: Record<string, unknown>): Producto {
  const cats = raw.categorias as { categoriaId: number }[] | undefined;
  const ings = raw.ingredientes as {
    ingredienteId: number;
    cantidad: number;
    unidadMedidaId: number;
    esRemovible: boolean;
  }[] | undefined;

  return {
    id: raw.id as number,
    nombre: raw.nombre as string,
    descripcion: (raw.descripcion as string) ?? "",
    imagenUrl: (raw.imagenUrl as string) ?? "",
    precioBase: raw.precioBase as number,
    precioSugerido: (raw.costoEstimado as number) ?? 0,
    tieneAlergenos: (raw.tieneAlergenos as boolean) ?? false,
    stockCantidad: (raw.stockCantidad as number) ?? 0,
    disponible: raw.disponible as boolean,
    unidadVentaId: (raw.unidadVentaId as number | null) ?? null,
    categoriaIds: cats?.map((c) => c.categoriaId) ?? [],
    ingredientes:
      ings?.map((i) => ({
        ingredienteId: i.ingredienteId,
        cantidad: i.cantidad,
        unidadMedidaId: i.unidadMedidaId ?? 1,
        esRemovible: i.esRemovible ?? false,
      })) ?? [],
    creadoEn: (raw.createdAt as string) ?? new Date().toISOString(),
    actualizadoEn:
      (raw.updatedAt as string) ?? (raw.createdAt as string) ?? new Date().toISOString(),
    eliminadoEn: (raw.deletedAt as string | null) ?? null,
  };
}

async function syncCategorias(
  productoId: number,
  newIds: number[],
  currentIds: number[]
): Promise<void> {
  const toAdd = newIds.filter((id) => !currentIds.includes(id));
  const toRemove = currentIds.filter((id) => !newIds.includes(id));
  await Promise.all([
    ...toAdd.map((id) =>
      apiClient.post(`/admin/productos/${productoId}/categorias`, {
        categoria_id: id,
        es_principal: false,
      })
    ),
    ...toRemove.map((id) =>
      apiClient.delete(`/admin/productos/${productoId}/categorias/${id}`)
    ),
  ]);
}

async function syncIngredientes(
  productoId: number,
  newIngs: ProductoFormData["ingredientes"],
  currentIngs: { ingredienteId: number }[]
): Promise<void> {
  const currentIds = currentIngs.map((i) => i.ingredienteId);
  const newIds = newIngs.map((i) => i.ingredienteId);
  const toAdd = newIngs.filter((i) => !currentIds.includes(i.ingredienteId));
  const toRemove = currentIds.filter((id) => !newIds.includes(id));
  await Promise.all([
    ...toAdd.map((i) =>
      apiClient.post(`/admin/productos/${productoId}/ingredientes`, {
        ingrediente_id: i.ingredienteId,
        cantidad: i.cantidad,
        unidad_medida_id: i.unidadMedidaId,
        es_removible: i.esRemovible,
      })
    ),
    ...toRemove.map((id) =>
      apiClient.delete(`/admin/productos/${productoId}/ingredientes/${id}`)
    ),
  ]);
}

export const productosApi = {
  async listar(filtros: FiltrosProductos = {}): Promise<Paginado<Producto>> {
    const params: Record<string, unknown> = {
      offset: filtros.skip ?? 0,
      limit: filtros.limit ?? 20,
    };
    const res = await apiClient.get<Record<string, unknown>>(
      "/admin/productos/",
      { params }
    );
    const raw = res.data as {
      items: Record<string, unknown>[];
      total: number;
      skip: number;
      limit: number;
    };
    return {
      items: raw.items.map(adaptProducto),
      total: raw.total,
      skip: raw.skip,
      limit: raw.limit,
    };
  },

  async obtener(id: number): Promise<Producto> {
    const res = await apiClient.get<Record<string, unknown>>(
      `/admin/productos/${id}`
    );
    return adaptProducto(res.data);
  },

  async crear(data: ProductoFormData): Promise<Producto> {
    // Step 1: create basic product
    const res = await apiClient.post<Record<string, unknown>>("/admin/productos/", {
      nombre: data.nombre,
      descripcion: data.descripcion || null,
      precio_base: data.precioBase,
      disponible: data.disponible,
      unidad_venta_id: data.unidadVentaId ?? null,
    });
    const newId = (res.data as { id: number }).id;

    // Step 2: add categories and ingredients in parallel
    await Promise.all([
      ...data.categoriaIds.map((id) =>
        apiClient.post(`/admin/productos/${newId}/categorias`, {
          categoria_id: id,
          es_principal: false,
        })
      ),
      ...data.ingredientes.map((i) =>
        apiClient.post(`/admin/productos/${newId}/ingredientes`, {
          ingrediente_id: i.ingredienteId,
          cantidad: i.cantidad,
          unidad_medida_id: i.unidadMedidaId,
          es_removible: i.esRemovible,
        })
      ),
    ]);

    // Step 3: return full product with detail
    const detail = await apiClient.get<Record<string, unknown>>(
      `/admin/productos/${newId}`
    );
    return adaptProducto(detail.data);
  },

  async editar(id: number, data: Partial<ProductoFormData>): Promise<Producto> {
    // Update basic fields
    await apiClient.patch(`/admin/productos/${id}`, {
      nombre: data.nombre,
      descripcion: data.descripcion ?? null,
      precio_base: data.precioBase,
      disponible: data.disponible,
      unidad_venta_id: data.unidadVentaId ?? null,
    });

    // Sync categories and ingredients if provided
    if (data.categoriaIds !== undefined || data.ingredientes !== undefined) {
      const current = await apiClient.get<Record<string, unknown>>(
        `/admin/productos/${id}`
      );
      const currentAdapted = adaptProducto(current.data);

      if (data.categoriaIds !== undefined) {
        await syncCategorias(id, data.categoriaIds, currentAdapted.categoriaIds);
      }
      if (data.ingredientes !== undefined) {
        await syncIngredientes(id, data.ingredientes, currentAdapted.ingredientes);
      }
    }

    const detail = await apiClient.get<Record<string, unknown>>(
      `/admin/productos/${id}`
    );
    return adaptProducto(detail.data);
  },

  async eliminar(id: number): Promise<void> {
    await apiClient.delete(`/admin/productos/${id}`);
  },

  async reactivar(id: number): Promise<Producto> {
    const res = await apiClient.post<Record<string, unknown>>(
      `/admin/productos/${id}/reactivar`
    );
    return adaptProducto(res.data);
  },
};
