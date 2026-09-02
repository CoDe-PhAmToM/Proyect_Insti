// ============================================================
// CONTEXT: Carrito
// Estado del carrito del cliente final (vista Catálogo/Personalizador)
// ============================================================

import React, { createContext, useContext, useState } from 'react';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);

  const agregarItem = (item) => {
    setItems(prev => [...prev, { ...item, id: Date.now() }]);
  };

  const quitarItem = (id) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const vaciarCarrito = () => setItems([]);

  const total = items.reduce((a, i) => a + i.precio, 0);

  return (
    <CartContext.Provider value={{ items, agregarItem, quitarItem, vaciarCarrito, total }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider');
  return ctx;
};
