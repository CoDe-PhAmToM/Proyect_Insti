// ============================================================
// BITÁCORA DE USO
//
// Esto no es una funcionalidad para el microempresario: es la
// instrumentación que permite escribir el capítulo de resultados.
//
// La tabla de operativización de variables del documento exige
// indicadores que ningún sistema mide solo:
//   - tiempo promedio en registrar una transacción, semana 1 vs 3
//   - frecuencia de uso (registros por día)
//   - completitud de los campos
//
// Los eventos se acumulan y se mandan de a tandas: una petición por
// clic sería un desperdicio, y sobre una conexión intermitente como
// la del Distrito 6, directamente un problema.
// ============================================================

import { api } from './api';

const cola = [];
let temporizador = null;

const enviar = async () => {
  if (cola.length === 0) return;
  const tanda = cola.splice(0, 50);
  try {
    await api.post('/eventos', tanda);
  } catch {
    // Si falla, se descarta: la bitácora nunca debe romperle el uso
    // al microempresario ni bloquear una pantalla.
  }
};

/** Registra un evento. No espera respuesta ni corta el flujo. */
export const anotar = (tipoEvento, datos = {}) => {
  cola.push({
    tipoEvento,
    entidad: datos.entidad ?? null,
    duracionMs: datos.duracionMs ?? null,
    metadata: datos.metadata ?? null,
  });

  clearTimeout(temporizador);
  temporizador = setTimeout(enviar, 3000);

  if (cola.length >= 20) enviar();
};

/**
 * Cronómetro para medir cuánto tarda una tarea.
 *
 *   const reloj = cronometrar();
 *   ... el usuario llena el formulario ...
 *   reloj.fin('registro_creado');
 */
export const cronometrar = () => {
  const inicio = performance.now();
  return {
    fin: (tipoEvento, datos = {}) =>
      anotar(tipoEvento, { ...datos, duracionMs: Math.round(performance.now() - inicio) }),
    cancelar: () => {},
  };
};

// Al cerrar la pestaña se manda lo que quedó pendiente.
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') enviar();
  });
}
