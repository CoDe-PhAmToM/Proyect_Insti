// ============================================================
// CONTEXT: Órdenes de producción
//
// Al mover el estado de una orden se recarga también el inventario:
// arrancar una orden descuenta tela, y cancelarla la devuelve. Si
// no se recargara, la pantalla de Materiales mostraría un stock que
// ya no es cierto.
// ============================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';
import { useMateriales } from './MaterialesContext';

const OrdenesContext = createContext(null);

const RESUMEN_VACIO = { total: 0, enProceso: 0, terminadas: 0, borradores: 0 };

export const OrdenesProvider = ({ children }) => {
  const { usuario } = useAuth();
  const { recargar: recargarInventario } = useMateriales();

  const [ordenes, setOrdenes] = useState([]);
  const [resumen, setResumen] = useState(RESUMEN_VACIO);
  const [equilibrio, setEquilibrio] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    if (!usuario || usuario.rol === 'CLIENTE') return;
    setCargando(true);
    setError(null);
    try {
      const d = await api.get('/ordenes');
      setOrdenes(d.ordenes);
      setResumen(d.resumen);

      // El ayudante no accede a indicadores de rentabilidad.
      if (usuario.rol !== 'AYUDANTE') {
        try {
          setEquilibrio(await api.get('/indicadores/punto-equilibrio'));
        } catch {
          setEquilibrio(null);
        }
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [usuario]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const crearOrden = useCallback(
    async (datos) => {
      const o = await api.post('/ordenes', datos);
      await cargar();
      return o;
    },
    [cargar]
  );

  const cambiarEstado = useCallback(
    async (id, estado, cantidadProducida) => {
      const o = await api.patch(`/ordenes/${id}/estado`, {
        estado,
        ...(cantidadProducida != null ? { cantidadProducida } : {}),
      });
      // El inventario cambió: recargarlo o la pantalla miente
      await Promise.all([cargar(), recargarInventario()]);
      return o;
    },
    [cargar, recargarInventario]
  );

  const borrarOrden = useCallback(
    async (id) => {
      await api.delete(`/ordenes/${id}`);
      await cargar();
    },
    [cargar]
  );

  const verCosteo = useCallback((id) => api.get(`/ordenes/${id}/costeo`), []);

  const agregarCosto = useCallback(
    async (id, costo) => {
      const c = await api.post(`/ordenes/${id}/costos`, costo);
      await cargar();
      return c;
    },
    [cargar]
  );

  return (
    <OrdenesContext.Provider
      value={{
        ordenes,
        resumen,
        equilibrio,
        cargando,
        error,
        crearOrden,
        cambiarEstado,
        borrarOrden,
        verCosteo,
        agregarCosto,
        recargar: cargar,
      }}
    >
      {children}
    </OrdenesContext.Provider>
  );
};

export const useOrdenes = () => {
  const ctx = useContext(OrdenesContext);
  if (!ctx) throw new Error('useOrdenes debe usarse dentro de OrdenesProvider');
  return ctx;
};
