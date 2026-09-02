// ============================================================
// CONTEXT: Materiales
// Estado compartido entre el CRUD de Materiales y el Costeo,
// para que un cambio de precio/stock se refleje en todo el sistema.
// ============================================================

import React, { createContext, useContext, useState } from 'react';
import { MATERIALES as MATERIALES_INICIALES } from '../data/mockData';

const MaterialesContext = createContext(null);

const calcularEstado = (stock, min) => {
  if (stock <= min * 0.5) return 'critico';
  if (stock <= min)       return 'bajo';
  return 'ok';
};

export const MaterialesProvider = ({ children }) => {
  const [materiales, setMateriales] = useState(MATERIALES_INICIALES);

  const agregarMaterial = (data) => {
    const nuevo = {
      ...data,
      estado: calcularEstado(data.stock, data.min),
    };
    setMateriales(prev => [...prev, nuevo]);
  };

  const editarMaterial = (codigo, data) => {
    setMateriales(prev => prev.map(m =>
      m.codigo === codigo
        ? { ...m, ...data, estado: calcularEstado(data.stock, data.min) }
        : m
    ));
  };

  const eliminarMaterial = (codigo) => {
    setMateriales(prev => prev.filter(m => m.codigo !== codigo));
  };

  return (
    <MaterialesContext.Provider value={{ materiales, agregarMaterial, editarMaterial, eliminarMaterial }}>
      {children}
    </MaterialesContext.Provider>
  );
};

export const useMateriales = () => {
  const ctx = useContext(MaterialesContext);
  if (!ctx) throw new Error('useMateriales debe usarse dentro de MaterialesProvider');
  return ctx;
};
