import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCarritoStore } from "../stores/carritoStore";
import { usePedidoMutations, useFormasPagoQuery } from "../hooks/usePedidos";
import type { FormaPago } from "../types";
import { ApiError } from "../api/client";

export default function CarritoPage() {
  const navigate = useNavigate();
  const items = useCarritoStore((s) => s.items);
  const quitar = useCarritoStore((s) => s.quitar);
  const actualizarCantidad = useCarritoStore((s) => s.actualizarCantidad);
  const limpiar = useCarritoStore((s) => s.limpiar);
  const total = useCarritoStore((s) => s.total);

  const { crear } = usePedidoMutations();
  const { data: formasPago = [] } = useFormasPagoQuery();

  const [formaPago, setFormaPago] = useState("");
  const [notas, setNotas] = useState("");
  const [error, setError] = useState<string | null>(null);

  const activas = formasPago.filter((fp: FormaPago) => fp.habilitado);

  async function handleConfirmar() {
    if (!formaPago) {
      setError("Selecciona una forma de pago");
      return;
    }
    if (items.length === 0) {
      setError("El carrito está vacío");
      return;
    }
    setError(null);
    crear.mutate(
      {
        formaPagoCodigo: formaPago,
        notas: notas.trim() || undefined,
        items: items.map((i) => ({
          productoId: i.producto.id,
          cantidad: i.cantidad,
        })),
      },
      {
        onSuccess: (pedido) => {
          limpiar();
          navigate(`/mis-pedidos/${pedido.id}`);
        },
        onError: (err) => {
          setError(
            err instanceof ApiError ? err.detail : "Error al confirmar el pedido"
          );
        },
      }
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Carrito</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          No hay productos en el carrito.
        </p>
        <button
          onClick={() => navigate("/")}
          className="bg-[#007aff] text-white px-6 py-2 rounded-xl hover:opacity-90 transition-opacity"
        >
          Ver catálogo
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Carrito</h1>

      {/* Items */}
      <div className="space-y-3 mb-6">
        {items.map((item) => (
          <div
            key={item.producto.id}
            className="bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-[#3a3a3c] rounded-2xl p-4 flex items-center gap-4"
          >
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white truncate">
                {item.producto.nombre}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                ${item.producto.precioBase.toLocaleString("es-AR")} c/u
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  actualizarCantidad(item.producto.id, item.cantidad - 1)
                }
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#2c2c2e] text-gray-700 dark:text-white flex items-center justify-center font-bold hover:bg-gray-200 dark:hover:bg-[#3a3a3c] transition-colors"
              >
                −
              </button>
              <span className="w-8 text-center font-semibold text-gray-900 dark:text-white">
                {item.cantidad}
              </span>
              <button
                onClick={() =>
                  actualizarCantidad(item.producto.id, item.cantidad + 1)
                }
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#2c2c2e] text-gray-700 dark:text-white flex items-center justify-center font-bold hover:bg-gray-200 dark:hover:bg-[#3a3a3c] transition-colors"
              >
                +
              </button>
            </div>

            <p className="font-bold text-gray-900 dark:text-white w-20 text-right">
              ${(item.producto.precioBase * item.cantidad).toLocaleString("es-AR")}
            </p>

            <button
              onClick={() => quitar(item.producto.id)}
              className="text-[#ff3b30] dark:text-[#ff453a] hover:opacity-70 transition-opacity ml-1"
              title="Quitar"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Checkout */}
      <div className="bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-[#3a3a3c] rounded-2xl p-5 space-y-4">
        <div className="flex justify-between items-center text-xl font-bold text-gray-900 dark:text-white">
          <span>Total</span>
          <span>${total().toLocaleString("es-AR")}</span>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Forma de pago *
          </label>
          <select
            value={formaPago}
            onChange={(e) => setFormaPago(e.target.value)}
            className="w-full bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#3a3a3c] rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#007aff]"
          >
            <option value="">Seleccionar...</option>
            {activas.map((fp: FormaPago) => (
              <option key={fp.codigo} value={fp.codigo}>
                {fp.descripcion}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notas (opcional)
          </label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
            placeholder="Instrucciones especiales..."
            className="w-full bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#3a3a3c] rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#007aff] resize-none"
          />
        </div>

        {error && (
          <p className="text-sm text-[#ff3b30] dark:text-[#ff453a] bg-red-50 dark:bg-[#ff453a]/10 border border-red-200 dark:border-[#ff453a]/30 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex-1 border border-gray-300 dark:border-[#48484a] text-gray-700 dark:text-gray-300 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-[#2c2c2e] transition-colors text-sm font-medium"
          >
            Seguir comprando
          </button>
          <button
            type="button"
            onClick={handleConfirmar}
            disabled={crear.isPending}
            className="flex-1 bg-[#007aff] dark:bg-[#0a84ff] hover:opacity-90 disabled:opacity-50 text-white py-3 rounded-xl transition-opacity text-sm font-semibold"
          >
            {crear.isPending ? "Confirmando..." : "Confirmar pedido"}
          </button>
        </div>
      </div>
    </div>
  );
}
