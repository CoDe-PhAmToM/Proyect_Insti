// ============================================================
// CONTEXT: Carrito de la tienda
//
// El carrito vive en el navegador hasta que se confirma el pedido:
// no tiene sentido ocupar la base con carritos abandonados. Recién
// al confirmar viaja al servidor, que recalcula los precios — nunca
// se confía en el precio que manda el cliente.
// ============================================================

import React, { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../lib/api';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [tallerId, setTallerId] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const agregarItem = useCallback((item) => {
    // Un carrito, un taller: el pedido se produce en un solo lugar.
    setTallerId((actual) => {
      if (actual && actual !== item.tallerId) setItems([]);
      return item.tallerId;
    });
    setItems((prev) => [...prev, { ...item, idLocal: `${Date.now()}-${Math.random()}` }]);
  }, []);

  const quitarItem = useCallback((idLocal) => {
    setItems((prev) => {
      const resto = prev.filter((i) => i.idLocal !== idLocal);
      if (resto.length === 0) setTallerId(null);
      return resto;
    });
  }, []);

  const vaciarCarrito = useCallback(() => {
    setItems([]);
    setTallerId(null);
  }, []);

  const confirmarPedido = useCallback(
    async (datosEntrega = {}) => {
      if (items.length === 0) throw new Error('El carrito está vacío');

      setEnviando(true);
      try {
        const r = await api.post('/pedidos', {
          tallerId,
          ...datosEntrega,
          items: items.map((i) => ({
            productoId: i.productoId,
            cantidad: i.cantidad ?? 1,
            color: i.color ?? null,
            colorHex: i.colorHex ?? null,
            talla: i.talla ?? null,
            estampado: i.estampado ?? null,
            posicionJson: i.posicionJson ?? null,
          })),
        });
        vaciarCarrito();
        return r;
      } finally {
        setEnviando(false);
      }
    },
    [items, tallerId, vaciarCarrito]
  );

  // Total estimado: el definitivo lo calcula el servidor
  const total = items.reduce((a, i) => a + Number(i.precio ?? 0) * (i.cantidad ?? 1), 0);

  return (
    <CartContext.Provider
      value={{ items, tallerId, total, enviando, agregarItem, quitarItem, vaciarCarrito, confirmarPedido }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider');
  return ctx;
};
