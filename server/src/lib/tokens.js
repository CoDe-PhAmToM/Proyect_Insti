// ============================================================
// TOKENS DE SESION
//
// Dos piezas con roles distintos:
//
//   access token  - JWT corto (15 min), viaja en el header, lo lee
//                   cada peticion. Si se filtra, sirve poco tiempo.
//   refresh token - cadena aleatoria larga (7 dias), viaja en cookie
//                   httpOnly (JavaScript de la pagina no la puede
//                   leer) y se guarda HASHEADO en la base. Si alguien
//                   roba la base, no puede fabricar sesiones.
//
// El refresh rota en cada uso: al canjearlo se revoca el anterior.
// Si un token robado se usa despues del legitimo, deja de servir.
// ============================================================

import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from './env.js';
import { prisma } from './prisma.js';
import { errores } from './errores.js';

const DIA_MS = 24 * 60 * 60 * 1000;

// ── Access token ─────────────────────────────────────────────

export const firmarAccessToken = ({ usuarioId, rol, tallerId }) =>
  jwt.sign({ rol, tallerId: tallerId ?? null }, env.jwt.accessSecret, {
    subject: usuarioId,
    expiresIn: env.jwt.accessTtl,
  });

export const verificarAccessToken = (token) => {
  try {
    const payload = jwt.verify(token, env.jwt.accessSecret);
    return { usuarioId: payload.sub, rol: payload.rol, tallerId: payload.tallerId };
  } catch (e) {
    throw e.name === 'TokenExpiredError' ? errores.sesionExpirada() : errores.noAutenticado();
  }
};

// ── Refresh token ────────────────────────────────────────────

const hashear = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const emitirRefreshToken = async (usuarioId) => {
  const token = crypto.randomBytes(48).toString('hex');
  const expiraEn = new Date(Date.now() + env.jwt.refreshTtlDias * DIA_MS);

  await prisma.refreshToken.create({
    data: { usuarioId, tokenHash: hashear(token), expiraEn },
  });

  return { token, expiraEn };
};

/**
 * Canjea un refresh token por uno nuevo (rotacion).
 * Devuelve el usuario si el token es valido; si no, lanza.
 */
export const rotarRefreshToken = async (token) => {
  if (!token) throw errores.noAutenticado();

  const guardado = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashear(token) },
    include: { usuario: true },
  });

  if (!guardado || guardado.revocado || guardado.expiraEn < new Date()) {
    throw errores.sesionExpirada();
  }
  if (!guardado.usuario.activo) {
    throw errores.sinPermiso('Tu cuenta esta desactivada');
  }

  await prisma.refreshToken.update({
    where: { id: guardado.id },
    data: { revocado: true },
  });

  const nuevo = await emitirRefreshToken(guardado.usuarioId);
  return { usuario: guardado.usuario, refresh: nuevo };
};

export const revocarRefreshToken = async (token) => {
  if (!token) return;
  await prisma.refreshToken
    .updateMany({ where: { tokenHash: hashear(token) }, data: { revocado: true } })
    .catch(() => {});
};

/** Cierra todas las sesiones del usuario (cambio de contrasena, robo). */
export const revocarTodasLasSesiones = (usuarioId) =>
  prisma.refreshToken.updateMany({
    where: { usuarioId, revocado: false },
    data: { revocado: true },
  });

// ── Cookie ───────────────────────────────────────────────────

export const COOKIE_REFRESH = 'gestione_refresh';

export const opcionesCookie = (expiraEn) => ({
  httpOnly: true,
  secure: env.esProduccion,
  // En produccion el frontend (Vercel) y la API (Render) viven en
  // dominios distintos, y ahi la cookie solo viaja con SameSite=None.
  sameSite: env.esProduccion ? 'none' : 'lax',
  expires: expiraEn,
  path: '/',
});
