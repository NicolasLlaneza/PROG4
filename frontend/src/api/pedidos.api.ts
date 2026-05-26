import { apiClient } from "./client";
import type {
  FormaPago,
  Paginado,
  Pedido,
  PedidoCreate,
  PedidoDetalle,
} from "../types";

function adaptPedido(raw: Record<string, unknown>): Pedido {
  return {
    id: raw.id as number,
    usuarioId: raw.usuarioId as number,
    direccionId: (raw.direccionId as number | null) ?? null,
    estadoCodigo: raw.estadoCodigo as Pedido["estadoCodigo"],
    formaPagoCodigo: raw.formaPagoCodigo as string,
    subtotal: Number(raw.subtotal ?? 0),
    descuento: Number(raw.descuento ?? 0),
    costoEnvio: Number(raw.costoEnvio ?? 0),
    total: Number(raw.total ?? 0),
    notas: (raw.notas as string | null) ?? null,
    creadoEn: (raw.createdAt as string) ?? new Date().toISOString(),
  };
}

function adaptPedidoDetalle(raw: Record<string, unknown>): PedidoDetalle {
  const base = adaptPedido(raw);
  const items = (raw.items as Record<string, unknown>[] | undefined) ?? [];
  const historial = (raw.historial as Record<string, unknown>[] | undefined) ?? [];
  return {
    ...base,
    items: items.map((i) => ({
      productoId: i.productoId as number,
      cantidad: i.cantidad as number,
      nombreSnapshot: i.nombreSnapshot as string,
      precioSnapshot: Number(i.precioSnapshot ?? 0),
      subtotalSnap: Number(i.subtotalSnap ?? 0),
      personalizacion: (i.personalizacion as number[] | null) ?? null,
    })),
    historial: historial.map((h) => ({
      id: h.id as number,
      estadoDesde: (h.estadoDesde as string | null) ?? null,
      estadoHacia: h.estadoHacia as string,
      usuarioId: (h.usuarioId as number | null) ?? null,
      motivo: (h.motivo as string | null) ?? null,
      creadoEn: (h.createdAt as string) ?? new Date().toISOString(),
    })),
  };
}

export const pedidosApi = {
  async crear(data: PedidoCreate): Promise<PedidoDetalle> {
    const res = await apiClient.post<Record<string, unknown>>("/pedidos/", {
      forma_pago_codigo: data.formaPagoCodigo,
      notas: data.notas ?? null,
      items: data.items.map((i) => ({
        producto_id: i.productoId,
        cantidad: i.cantidad,
        personalizacion: i.personalizacion ?? null,
      })),
    });
    return adaptPedidoDetalle(res.data);
  },

  async listar(skip = 0, limit = 20): Promise<Paginado<Pedido>> {
    const res = await apiClient.get<Record<string, unknown>>("/pedidos/mis-pedidos", {
      params: { offset: skip, limit },
    });
    const raw = res.data as {
      items: Record<string, unknown>[];
      total: number;
      skip: number;
      limit: number;
    };
    return {
      items: raw.items.map(adaptPedido),
      total: raw.total,
      skip: raw.skip,
      limit: raw.limit,
    };
  },

  async obtener(id: number): Promise<PedidoDetalle> {
    const res = await apiClient.get<Record<string, unknown>>(`/pedidos/${id}`);
    return adaptPedidoDetalle(res.data);
  },

  async avanzarEstado(
    id: number,
    estadoHacia: string,
    motivo?: string
  ): Promise<PedidoDetalle> {
    const res = await apiClient.post<Record<string, unknown>>(
      `/pedidos/${id}/estado`,
      { estado_hacia: estadoHacia, motivo: motivo ?? null }
    );
    return adaptPedidoDetalle(res.data);
  },

  async cancelar(id: number): Promise<PedidoDetalle> {
    return pedidosApi.avanzarEstado(id, "cancelado");
  },

  async listarFormasPago(): Promise<FormaPago[]> {
    const res = await apiClient.get<Record<string, unknown>[]>("/pedidos/formas-pago");
    return res.data as unknown as FormaPago[];
  },

  async listarTodos(skip = 0, limit = 20): Promise<Paginado<Pedido>> {
    const res = await apiClient.get<Record<string, unknown>>("/pedidos/admin/todos", {
      params: { offset: skip, limit },
    });
    const raw = res.data as {
      items: Record<string, unknown>[];
      total: number;
      skip: number;
      limit: number;
    };
    return {
      items: raw.items.map(adaptPedido),
      total: raw.total,
      skip: raw.skip,
      limit: raw.limit,
    };
  },
};
