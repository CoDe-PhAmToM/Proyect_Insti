// ============================================================
// CONTEXT: Registros (ingresos/egresos)
// Fuente única de verdad. Dashboard, Registros y Reportes leen
// de acá — así los tres muestran siempre la misma ganancia real,
// nunca números calculados por separado que puedan desincronizarse.
// ============================================================

import React, { createContext, useContext, useState } from 'react';
import { REGISTROS as REGISTROS_INICIALES } from '../data/mockData';

const RegistrosContext = createContext(null);

export const RegistrosProvider = ({ children }) => {
  const [registros, setRegistros] = useState(REGISTROS_INICIALES);

  const agregarRegistro = (data) => {
    const nuevo = {
      id: Math.max(0, ...registros.map(r => r.id)) + 1,
      ...data,
    };
    setRegistros(prev => [nuevo, ...prev]);
  };

  // Totales derivados una sola vez acá — todas las vistas consumen
  // el mismo cálculo, nunca lo repiten a mano.
  const totalIngresos     = registros.filter(r => r.tipo === 'ingreso').reduce((a, r) => a + r.monto, 0);
  const totalEgresos      = registros.filter(r => r.tipo === 'egreso').reduce((a, r) => a + r.monto, 0);
  const totalPersonal     = registros.filter(r => r.origen === 'personal').reduce((a, r) => a + r.monto, 0);
  const gananciaReal      = totalIngresos - totalEgresos;
  const gananciaSinMezcla = gananciaReal + totalPersonal;

  const egresosPorCategoria = registros
    .filter(r => r.tipo === 'egreso')
    .reduce((acc, r) => {
      acc[r.categoria] = (acc[r.categoria] || 0) + r.monto;
      return acc;
    }, {});

  return (
    <RegistrosContext.Provider value={{
      registros,
      agregarRegistro,
      totalIngresos,
      totalEgresos,
      totalPersonal,
      gananciaReal,
      gananciaSinMezcla,
      egresosPorCategoria,
    }}>
      {children}
    </RegistrosContext.Provider>
  );
};

export const useRegistros = () => {
  const ctx = useContext(RegistrosContext);
  if (!ctx) throw new Error('useRegistros debe usarse dentro de RegistrosProvider');
  return ctx;
};
