// ============================================================
// CLIENTE HTTP
//
// Un solo lugar por donde pasan todas las llamadas al servidor.
//
// Dos cosas que resuelve y que no conviene repetir en cada vista:
//  - Renueva sola la sesion. El token de acceso dura 15 minutos; si
//    vence a mitad de una carga, pide uno nuevo con la cookie y
//    reintenta la peticion. El usuario no se entera.
//  - Traduce las fallas de red a un mensaje en castellano. "Failed
//    to fetch" no le dice nada a nadie.
// ============================================================

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1';

let accessToken = null;
let alExpirarSesion = null;
let renovacionEnCurso = null;

export const setAccessToken = (t) => {
  accessToken = t;
};
export const getAccessToken = () => accessToken;

/** La app registra aca que hacer cuando la sesion muere del todo. */
export const onSesionExpirada = (fn) => {
  alExpirarSesion = fn;
};

export class ErrorApi extends Error {
  constructor(mensaje, estado, detalles) {
    super(mensaje);
    this.estado = estado;
    // Errores por campo, para pintarlos junto a cada input
    this.detalles = detalles ?? null;
  }
}

const renovar = async () => {
  // Si ya hay una renovacion en curso, las demas peticiones esperan
  // esa misma en vez de disparar varias en paralelo.
  renovacionEnCurso ??= (async () => {
    try {
      const r = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!r.ok) return null;
      const d = await r.json();
      accessToken = d.accessToken;
      return d;
    } catch {
      return null;
    } finally {
      // Se libera en el proximo tick para que los que esperaban lean el valor
      setTimeout(() => {
        renovacionEnCurso = null;
      }, 0);
    }
  })();

  return renovacionEnCurso;
};

const pedir = async (ruta, opciones = {}, reintentando = false) => {
  const { body, ...resto } = opciones;

  let respuesta;
  try {
    respuesta = await fetch(`${BASE}${ruta}`, {
      ...resto,
      credentials: 'include',
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...resto.headers,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new ErrorApi(
      'No se pudo conectar con el servidor. Revisa tu internet y volve a intentar.',
      0
    );
  }

  // Sesion vencida: se renueva una vez y se reintenta.
  if (respuesta.status === 401 && !reintentando && !ruta.startsWith('/auth/')) {
    const renovado = await renovar();
    if (renovado) return pedir(ruta, opciones, true);
    alExpirarSesion?.();
    throw new ErrorApi('Tu sesion vencio. Volve a iniciar sesion.', 401);
  }

  if (respuesta.status === 204) return null;

  let datos = null;
  try {
    datos = await respuesta.json();
  } catch {
    datos = null;
  }

  if (!respuesta.ok) {
    throw new ErrorApi(
      datos?.error ?? 'Algo fallo. Volve a intentar en un momento.',
      respuesta.status,
      datos?.detalles
    );
  }

  return datos;
};

const qs = (params = {}) => {
  const limpio = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return limpio.length ? `?${new URLSearchParams(limpio)}` : '';
};

export const api = {
  get: (ruta, params) => pedir(`${ruta}${qs(params)}`),
  post: (ruta, body) => pedir(ruta, { method: 'POST', body }),
  patch: (ruta, body) => pedir(ruta, { method: 'PATCH', body }),
  put: (ruta, body) => pedir(ruta, { method: 'PUT', body }),
  delete: (ruta) => pedir(ruta, { method: 'DELETE' }),

  // ── Sesion ─────────────────────────────────────────────────
  login: (email, password) => pedir('/auth/login', { method: 'POST', body: { email, password } }),
  registro: (datos) => pedir('/auth/registro', { method: 'POST', body: datos }),
  logout: () => pedir('/auth/logout', { method: 'POST' }),
  yo: () => pedir('/auth/yo'),
  renovarSesion: renovar,
};
