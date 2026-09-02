// ============================================================
// CONTEXT: Materiales y productos
//
// Estado compartido entre el inventario y el costeo, para que un
// cambio de precio se refleje en todo el sistema al instante.
//
// El stock ya no se edita a mano: se mueve con entradas, salidas y
// ajustes, que dejan rastro en el kardex. Cambiar el numero de
// stock directamente descuadraria la contabilidad del inventario.
// ============================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

const MaterialesContext = createContext(null);

const RESUMEN_VACIO = { total: 0, valorInventario: 0, criticos: 0, bajos: 0 };

export const MaterialesProvider = ({ children }) => {
  const { usuario } = useAuth();

  const [materiales, setMateriales] = useState([]);
  const [productos, setProductos] = useState([]);
  const [resumen, setResumen] = useState(RESUMEN_VACIO);
  const [costosFijos, setCostosFijos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    if (!usuario || usuario.rol === 'CLIENTE') return;
    setCargando(true);
    setError(null);
    try {
      const [m, p] = await Promise.all([api.get('/materiales'), api.get('/productos')]);
      setMateriales(m.materiales);
      setResumen(m.resumen);
      setProductos(p.productos);

      // El ayudante no tiene acceso a costos fijos: se omite sin ruido.
      if (usuario.rol !== 'AYUDANTE') {
        try {
          setCostosFijos(await api.get('/costos-fijos'));
        } catch {
          setCostosFijos(null);
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

  // ── Materiales ─────────────────────────────────────────────

  const agregarMaterial = useCallback(
    async (datos) => {
      const m = await api.post('/materiales', datos);
      await cargar();
      return m;
    },
    [cargar]
  );

  const editarMaterial = useCallback(
    async (id, datos) => {
      // El stock nunca viaja en una edicion: se mueve por kardex.
      const { stock, estado, valorInventario, ...limpio } = datos;
      const m = await api.patch(`/materiales/${id}`, limpio);
      await cargar();
      return m;
    },
    [cargar]
  );

  const eliminarMaterial = useCallback(
    async (id) => {
      const r = await api.delete(`/materiales/${id}`);
      await cargar();
      return r;
    },
    [cargar]
  );

  const moverStock = useCallback(
    async (id, movimiento) => {
      const r = await api.post(`/materiales/${id}/movimientos`, movimiento);
      await cargar();
      return r;
    },
    [cargar]
  );

  const verKardex = useCallback((id, rango) => api.get(`/materiales/${id}/kardex`, rango), []);

  // ── Productos ──────────────────────────────────────────────

  const agregarProducto = useCallback(
    async ({ receta, ...datos }) => {
      const p = await api.post('/productos', datos);
      if (receta?.length) await api.put(`/productos/${p.id}/receta`, { items: receta });
      await cargar();
      return p;
    },
    [cargar]
  );

  const editarProducto = useCallback(
    async (id, datos) => {
      const p = await api.patch(`/productos/${id}`, datos);
      await cargar();
      return p;
    },
    [cargar]
  );

  const guardarReceta = useCallback(
    async (id, items) => {
      const p = await api.put(`/productos/${id}/receta`, { items });
      await cargar();
      return p;
    },
    [cargar]
  );

  const verProducto = useCallback((id) => api.get(`/productos/${id}`), []);

  // ── Costos fijos ───────────────────────────────────────────

  const agregarCostoFijo = useCallback(
    async (datos) => {
      const c = await api.post('/costos-fijos', datos);
      await cargar();
      return c;
    },
    [cargar]
  );

  const eliminarCostoFijo = useCallback(
    async (id) => {
      await api.delete(`/costos-fijos/${id}`);
      await cargar();
    },
    [cargar]
  );

  return (
    <MaterialesContext.Provider
      value={{
        materiales,
        productos,
        resumen,
        costosFijos,
        cargando,
        error,
        agregarMaterial,
        editarMaterial,
        eliminarMaterial,
        moverStock,
        verKardex,
        agregarProducto,
        editarProducto,
        guardarReceta,
        verProducto,
        agregarCostoFijo,
        eliminarCostoFijo,
        recargar: cargar,
      }}
    >
      {children}
    </MaterialesContext.Provider>
  );
};

export const useMateriales = () => {
  const ctx = useContext(MaterialesContext);
  if (!ctx) throw new Error('useMateriales debe usarse dentro de MaterialesProvider');
  return ctx;
};
