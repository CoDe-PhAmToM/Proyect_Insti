// ============================================================
// DESCARGA DE ARCHIVOS
//
// Los reportes salen del servidor con el token de sesión en el
// header, así que no se pueden abrir con un <a href> común: esa
// petición iría sin autenticar y devolvería 401.
//
// Se descarga con fetch, se arma un blob y se dispara el guardado.
// ============================================================

import { getAccessToken, ErrorApi } from './api';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1';

/**
 * @param {string} ruta   ej: '/reportes/comparativo/export'
 * @param {object} params ej: { formato: 'pdf', periodo: '2026-09' }
 * @param {string} nombreSugerido nombre por defecto si el servidor no manda uno
 */
export const descargarArchivo = async (ruta, params = {}, nombreSugerido = 'reporte') => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );

  let respuesta;
  try {
    respuesta = await fetch(`${BASE}${ruta}?${qs}`, {
      credentials: 'include',
      headers: getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {},
    });
  } catch {
    throw new ErrorApi('No se pudo conectar con el servidor para bajar el archivo.', 0);
  }

  if (!respuesta.ok) {
    // El error viene en JSON aunque la ruta devuelva archivos
    let mensaje = 'No se pudo generar el archivo.';
    try {
      const d = await respuesta.json();
      mensaje = d.error ?? mensaje;
    } catch {
      /* respuesta sin cuerpo legible */
    }
    throw new ErrorApi(mensaje, respuesta.status);
  }

  // El nombre real lo manda el servidor en Content-Disposition
  const dispo = respuesta.headers.get('content-disposition') ?? '';
  const coincidencia = dispo.match(/filename="?([^"]+)"?/);
  const nombre = coincidencia?.[1] ?? nombreSugerido;

  const blob = await respuesta.blob();
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();

  // Liberar la memoria del blob una vez disparada la descarga
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return nombre;
};
