// ============================================================
// REPORTE DE ERRORES AL SERVIDOR
//
// Si algo falla en el celular de una microempresaria, sin esto el
// equipo no se entera nunca. Ella cree que hizo algo mal, deja de
// usar el sistema, y el piloto pierde un caso sin que nadie sepa
// por qué.
//
// Reportar un error NUNCA debe generar otro: todo va con catch y
// nada bloquea la interfaz.
// ============================================================

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1';

// No mandar el mismo error 200 veces si algo entra en bucle.
const yaReportados = new Set();

export const reportarError = (error, extra = {}) => {
  try {
    const mensaje = String(error?.message ?? error ?? 'error sin mensaje').slice(0, 500);
    const clave = `${mensaje}|${extra.ruta ?? ''}`;
    if (yaReportados.has(clave)) return;
    yaReportados.add(clave);

    // No tiene sentido reportar que no hay internet: el reporte
    // tampoco va a llegar, y no es un error del sistema.
    if (!navigator.onLine) return;
    if (/failed to fetch|networkerror|load failed/i.test(mensaje)) return;

    fetch(`${BASE}/errores`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mensaje,
        pila: String(error?.stack ?? '').slice(0, 4000),
        ruta: extra.ruta ?? window.location.pathname,
        metadata: { ...extra, pantalla: `${window.innerWidth}x${window.innerHeight}` },
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Silencio absoluto: esto no puede romper nada.
  }
};

/** Engancha los errores que no atrapa nadie. */
export const engancharErroresGlobales = () => {
  window.addEventListener('error', (e) => {
    reportarError(e.error ?? e.message, { tipo: 'global' });
  });
  window.addEventListener('unhandledrejection', (e) => {
    reportarError(e.reason, { tipo: 'promesa' });
  });
};
