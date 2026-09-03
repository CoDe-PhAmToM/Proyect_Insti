// ============================================================
// FUNCIONAMIENTO SIN INTERNET
//
// El ítem 9 de la encuesta del equipo dice, textual:
//   "Si la aplicación funcionara sin internet y fuera muy fácil de
//    usar, la usaría todos los días."
//
// Es un requisito que salió de los propios usuarios, no una idea
// nuestra. Y en el Distrito 6 la conexión es intermitente: si al
// perder señal la app se rompe o pierde lo anotado, se abandona.
//
// Cómo funciona: los movimientos creados sin señal se guardan en
// IndexedDB y se envían solos al reconectar. La persona sigue
// anotando como si nada.
//
// IndexedDB y no localStorage porque localStorage es sincrónico y
// traba la interfaz, y porque tiene un tope de ~5 MB.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { api } from './api';

const BASE_DATOS = 'gestione';
const ALMACEN = 'pendientes';

let bd = null;

const abrirBD = () =>
  new Promise((resolve, reject) => {
    if (bd) return resolve(bd);

    const peticion = indexedDB.open(BASE_DATOS, 1);

    peticion.onupgradeneeded = () => {
      const db = peticion.result;
      if (!db.objectStoreNames.contains(ALMACEN)) {
        db.createObjectStore(ALMACEN, { keyPath: 'id', autoIncrement: true });
      }
    };

    peticion.onsuccess = () => {
      bd = peticion.result;
      resolve(bd);
    };
    peticion.onerror = () => reject(peticion.error);
  });

const conAlmacen = async (modo, fn) => {
  const db = await abrirBD();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ALMACEN, modo);
    const almacen = tx.objectStore(ALMACEN);
    const peticion = fn(almacen);
    peticion.onsuccess = () => resolve(peticion.result);
    peticion.onerror = () => reject(peticion.error);
  });
};

export const encolar = (peticion) =>
  conAlmacen('readwrite', (a) => a.add({ ...peticion, encoladoEn: Date.now() }));

export const listarPendientes = () => conAlmacen('readonly', (a) => a.getAll());

export const quitarPendiente = (id) => conAlmacen('readwrite', (a) => a.delete(id));

export const contarPendientes = async () => {
  try {
    return await conAlmacen('readonly', (a) => a.count());
  } catch {
    return 0;
  }
};

/**
 * Envía la cola en orden. Si algo falla por red, se detiene y deja
 * el resto para el próximo intento.
 *
 * Si el servidor rechaza un movimiento por datos inválidos (400),
 * se descarta: reintentarlo eternamente solo llenaría la cola. Es
 * mejor perder un registro mal formado que trabar los siguientes.
 */
export const sincronizar = async () => {
  const pendientes = await listarPendientes();
  let enviados = 0;
  let descartados = 0;

  for (const p of pendientes.sort((a, b) => a.encoladoEn - b.encoladoEn)) {
    try {
      await api.post(p.ruta, p.cuerpo);
      await quitarPendiente(p.id);
      enviados++;
    } catch (e) {
      if (e.estado >= 400 && e.estado < 500) {
        await quitarPendiente(p.id);
        descartados++;
        continue;
      }
      break; // problema de red: se reintenta más tarde
    }
  }

  return { enviados, descartados, quedan: await contarPendientes() };
};

// ── Hook ─────────────────────────────────────────────────────

export const useConexion = () => {
  const [enLinea, setEnLinea] = useState(navigator.onLine);
  const [pendientes, setPendientes] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);

  const refrescar = useCallback(async () => {
    setPendientes(await contarPendientes());
  }, []);

  const enviarCola = useCallback(async () => {
    if (!navigator.onLine) return;
    setSincronizando(true);
    try {
      await sincronizar();
    } finally {
      setSincronizando(false);
      await refrescar();
    }
  }, [refrescar]);

  useEffect(() => {
    refrescar();

    const alConectar = () => {
      setEnLinea(true);
      enviarCola();
    };
    const alDesconectar = () => setEnLinea(false);

    window.addEventListener('online', alConectar);
    window.addEventListener('offline', alDesconectar);
    // Otras partes de la app avisan cuando encolan algo
    window.addEventListener('gestione:cola', refrescar);

    // Al abrir, si hay señal, se manda lo que quedó de la vez pasada
    if (navigator.onLine) enviarCola();

    return () => {
      window.removeEventListener('online', alConectar);
      window.removeEventListener('offline', alDesconectar);
      window.removeEventListener('gestione:cola', refrescar);
    };
  }, [refrescar, enviarCola]);

  return { enLinea, pendientes, sincronizando, enviarCola, refrescar };
};

/** Avisa a la interfaz que cambió la cola. */
export const avisarCola = () => window.dispatchEvent(new Event('gestione:cola'));
