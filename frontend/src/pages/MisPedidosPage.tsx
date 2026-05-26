import { useParams, useNavigate } from "react-router-dom";
import { useMisPedidosQuery, usePedidoQuery, usePedidoMutations } from "../hooks/usePedidos";
import type { Pedido } from "../types";

const ESTADO_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  en_preparacion: "En preparación",
  en_camino: "En camino",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

const ESTADO_COLOR: Record<string, string> = {
  pendiente: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  confirmado: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  en_preparacion: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  en_camino: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  entregado: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelado: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

function PedidoCard({ pedido, onClick }: { pedido: Pedido; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-[#3a3a3c] rounded-2xl p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">Pedido #{pedido.id}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {new Date(pedido.creadoEn).toLocaleDateString("es-AR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`text-xs font-semibold px-2 py-1 rounded-full ${ESTADO_COLOR[pedido.estadoCodigo] ?? "bg-gray-100 text-gray-700"}`}
          >
            {ESTADO_LABEL[pedido.estadoCodigo] ?? pedido.estadoCodigo}
          </span>
          <span className="font-bold text-gray-900 dark:text-white">
            ${pedido.total.toLocaleString("es-AR")}
          </span>
        </div>
      </div>
    </button>
  );
}

function PedidoDetallePage({ id }: { id: number }) {
  const navigate = useNavigate();
  const { data: pedido, isLoading } = usePedidoQuery(id);
  const { cancelar } = usePedidoMutations();

  if (isLoading) {
    return <div className="text-center py-10 text-gray-500 dark:text-gray-400">Cargando...</div>;
  }
  if (!pedido) {
    return (
      <div className="text-center py-10 text-gray-500 dark:text-gray-400">
        Pedido no encontrado.
      </div>
    );
  }

  const puedeCancelar = pedido.estadoCodigo === "pendiente";

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
      <button
        onClick={() => navigate("/mis-pedidos")}
        className="text-[#007aff] dark:text-[#0a84ff] text-sm font-medium hover:opacity-70 transition-opacity"
      >
        ← Mis pedidos
      </button>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Pedido #{pedido.id}
        </h2>
        <span
          className={`text-sm font-semibold px-3 py-1 rounded-full ${ESTADO_COLOR[pedido.estadoCodigo] ?? ""}`}
        >
          {ESTADO_LABEL[pedido.estadoCodigo] ?? pedido.estadoCodigo}
        </span>
      </div>

      {/* Items */}
      <div className="bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-[#3a3a3c] rounded-2xl divide-y divide-gray-100 dark:divide-[#3a3a3c]">
        {pedido.items.map((item, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{item.nombreSnapshot}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {item.cantidad} × ${Number(item.precioSnapshot).toLocaleString("es-AR")}
              </p>
            </div>
            <p className="font-semibold text-gray-900 dark:text-white">
              ${Number(item.subtotalSnap).toLocaleString("es-AR")}
            </p>
          </div>
        ))}
        <div className="flex justify-between px-4 py-3 font-bold text-gray-900 dark:text-white text-lg">
          <span>Total</span>
          <span>${pedido.total.toLocaleString("es-AR")}</span>
        </div>
      </div>

      {/* Historial */}
      {pedido.historial.length > 0 && (
        <div className="bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-[#3a3a3c] rounded-2xl p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Historial</h3>
          <ol className="space-y-2">
            {pedido.historial.map((h) => (
              <li key={h.id} className="flex items-start gap-3 text-sm">
                <span className="w-2 h-2 rounded-full bg-[#007aff] mt-1.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {ESTADO_LABEL[h.estadoHacia] ?? h.estadoHacia}
                  </span>
                  {h.motivo && (
                    <span className="text-gray-500 dark:text-gray-400"> — {h.motivo}</span>
                  )}
                  <p className="text-gray-400 dark:text-gray-500 text-xs">
                    {new Date(h.creadoEn).toLocaleString("es-AR")}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {puedeCancelar && (
        <button
          onClick={() =>
            cancelar.mutate(pedido.id, {
              onSuccess: () => navigate("/mis-pedidos"),
            })
          }
          disabled={cancelar.isPending}
          className="w-full bg-[#ff3b30] dark:bg-[#ff453a] hover:opacity-90 disabled:opacity-50 text-white py-3 rounded-xl transition-opacity text-sm font-semibold"
        >
          {cancelar.isPending ? "Cancelando..." : "Cancelar pedido"}
        </button>
      )}
    </div>
  );
}

export default function MisPedidosPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useMisPedidosQuery();

  if (id) return <PedidoDetallePage id={Number(id)} />;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Mis pedidos</h1>

      {isLoading && (
        <div className="text-center py-10 text-gray-500 dark:text-gray-400">Cargando...</div>
      )}

      {!isLoading && (data?.items ?? []).length === 0 && (
        <div className="text-center py-10">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No tenés pedidos aún.</p>
          <button
            onClick={() => navigate("/")}
            className="bg-[#007aff] text-white px-6 py-2 rounded-xl hover:opacity-90 transition-opacity"
          >
            Ver catálogo
          </button>
        </div>
      )}

      <div className="space-y-3">
        {(data?.items ?? []).map((p: Pedido) => (
          <PedidoCard
            key={p.id}
            pedido={p}
            onClick={() => navigate(`/mis-pedidos/${p.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
