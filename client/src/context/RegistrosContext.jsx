// ============================================================
// CONTEXT: Registros (ingresos, egresos y retiros)
//
// Fuente unica de verdad. Panel, Registros y Reportes leen de aca,
// asi los tres muestran siempre la misma ganancia real.
//
// Los totales YA NO se calculan en el navegador: los manda el
// servidor, que los saca del mismo motor compartido. Antes cada
// vista sumaba por su cuenta y podian discrepar.
// ============================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { encolar, avisarCola } from '../lib/conexion';
import { useAuth } from './AuthContext';

const RegistrosContext = createContext(null);

const TOTALES_VACIOS = {
  ingresos: 0,
  egresos: 0,
  retiros: 0,
  mezclaPersonal: 0,
  gananciaReal: 0,
  gananciaSinMezcla: 0,
  relacionCostoIngreso: null,
};

export const RegistrosProvider = ({ children }) => {
  const { usuario } = useAuth();

  const [registros, setRegistros] = useState([]);
  const [totales, setTotales] = useState(TOTALES_VACIOS);
  const [egresosPorCategoria, setEgresosPorCategoria] = useState({});
  const [categorias, setCategorias] = useState({ INGRESO: [], EGRESO: [], RETIRO: [] });
  const [alertas, setAlertas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [filtroFechas, setFiltroFechas] = useState({ desde: null, hasta: null });

  const cargar = useCallback(async () => {
    if (!usuario || usuario.rol === 'CLIENTE') return;
    setCargando(true);
    setError(null);
    try {
      const [d, c] = await Promise.all([
        api.get('/registros', filtroFechas),
        api.get('/categorias'),
      ]);
      setRegistros(d.registros);
      setTotales(d.totales);
      setEgresosPorCategoria(d.egresosPorCategoria);
      setCategorias(c.porTipo);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [usuario, filtroFechas]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const agregarRegistro = useCallback(
    async (datos) => {
      // Sin señal, el movimiento se guarda en el celular y se manda
      // solo al reconectar. Perder lo anotado es la forma mas rapida
      // de que alguien abandone la app.
      if (!navigator.onLine) {
        await encolar({ ruta: '/registros', cuerpo: datos });
        avisarCola();
        return { encolado: true };
      }

      const r = await api.post('/registros', datos);
      // Se recarga en vez de insertar a mano: los totales y las
      // alertas los decide el servidor, no el navegador.
      await cargar();
      if (r.alertas?.length) setAlertas((prev) => [...r.alertas, ...prev]);
      return r.registro;
    },
    [cargar]
  );

  const eliminarRegistro = useCallback(
    async (id) => {
      await api.delete(`/registros/${id}`);
      await cargar();
    },
    [cargar]
  );

  const buscarDuplicado = useCallback(
    (datos) => api.get('/registros/posible-duplicado', datos).then((d) => d.duplicado),
    []
  );

  const descartarAlerta = (i) => setAlertas((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <RegistrosContext.Provider
      value={{
        registros,
        categorias,
        alertas,
        cargando,
        error,
        filtroFechas,
        setFiltroFechas,
        agregarRegistro,
        eliminarRegistro,
        buscarDuplicado,
        descartarAlerta,
        recargar: cargar,
        ...totales,
        egresosPorCategoria,
      }}
    >
      {children}
    </RegistrosContext.Provider>
  );
};

export const useRegistros = () => {
  const ctx = useContext(RegistrosContext);
  if (!ctx) throw new Error('useRegistros debe usarse dentro de RegistrosProvider');
  return ctx;
};
