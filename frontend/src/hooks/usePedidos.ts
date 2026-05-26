import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pedidosApi } from "../api/pedidos.api";
import type { PedidoCreate } from "../types";

const KEY = "pedidos";

export function useMisPedidosQuery(skip = 0, limit = 20) {
  return useQuery({
    queryKey: [KEY, "mis", skip, limit],
    queryFn: () => pedidosApi.listar(skip, limit),
    staleTime: 1000 * 30,
  });
}

export function usePedidoQuery(id: number) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => pedidosApi.obtener(id),
    enabled: id > 0,
  });
}

export function useTodosPedidosQuery(skip = 0, limit = 20) {
  return useQuery({
    queryKey: [KEY, "todos", skip, limit],
    queryFn: () => pedidosApi.listarTodos(skip, limit),
    staleTime: 1000 * 30,
  });
}

export function useFormasPagoQuery() {
  return useQuery({
    queryKey: ["formas-pago"],
    queryFn: () => pedidosApi.listarFormasPago(),
    staleTime: 1000 * 60 * 5,
  });
}

export function usePedidoMutations() {
  const qc = useQueryClient();
  const invalidar = () => qc.invalidateQueries({ queryKey: [KEY] });

  const crear = useMutation({
    mutationFn: (data: PedidoCreate) => pedidosApi.crear(data),
    onSuccess: invalidar,
  });

  const cancelar = useMutation({
    mutationFn: (id: number) => pedidosApi.cancelar(id),
    onSuccess: invalidar,
  });

  const avanzar = useMutation({
    mutationFn: ({ id, estado, motivo }: { id: number; estado: string; motivo?: string }) =>
      pedidosApi.avanzarEstado(id, estado, motivo),
    onSuccess: invalidar,
  });

  return { crear, cancelar, avanzar };
}
