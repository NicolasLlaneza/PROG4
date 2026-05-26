import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ItemCarrito, Producto } from "../types";

interface CarritoState {
  items: ItemCarrito[];
  agregar: (producto: Producto, cantidad?: number) => void;
  quitar: (productoId: number) => void;
  actualizarCantidad: (productoId: number, cantidad: number) => void;
  limpiar: () => void;
  total: () => number;
  conteo: () => number;
}

export const useCarritoStore = create<CarritoState>()(
  persist(
    (set, get) => ({
      items: [],

      agregar: (producto, cantidad = 1) => {
        set((state) => {
          const idx = state.items.findIndex((i) => i.producto.id === producto.id);
          if (idx >= 0) {
            const updated = [...state.items];
            updated[idx] = {
              ...updated[idx],
              cantidad: updated[idx].cantidad + cantidad,
            };
            return { items: updated };
          }
          return { items: [...state.items, { producto, cantidad }] };
        });
      },

      quitar: (productoId) =>
        set((state) => ({
          items: state.items.filter((i) => i.producto.id !== productoId),
        })),

      actualizarCantidad: (productoId, cantidad) => {
        if (cantidad <= 0) {
          get().quitar(productoId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.producto.id === productoId ? { ...i, cantidad } : i
          ),
        }));
      },

      limpiar: () => set({ items: [] }),

      total: () =>
        get().items.reduce(
          (sum, i) => sum + i.producto.precioBase * i.cantidad,
          0
        ),

      conteo: () =>
        get().items.reduce((sum, i) => sum + i.cantidad, 0),
    }),
    {
      name: "food-store-carrito",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    }
  )
);
