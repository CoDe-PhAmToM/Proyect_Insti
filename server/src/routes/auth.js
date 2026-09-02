// ============================================================
// RUTAS DE SESION
// registro, login, refresh, logout y "quien soy"
// ============================================================

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { errores } from '../lib/errores.js';
import {
  firmarAccessToken,
  emitirRefreshToken,
  rotarRefreshToken,
  revocarRefreshToken,
  COOKIE_REFRESH,
  opcionesCookie,
} from '../lib/tokens.js';
import { autenticar } from '../middleware/auth.js';

export const rutasAuth = Router();

// Freno a la fuerza bruta: 10 intentos cada 15 min por IP.
const limitarIntentos = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera unos minutos y volve a probar.' },
});

// ── Validacion ───────────────────────────────────────────────

const esquemaRegistro = z.object({
  email: z.string().email('Ese correo no parece valido').toLowerCase().trim(),
  password: z.string().min(8, 'La contrasena necesita al menos 8 caracteres'),
  nombre: z.string().min(2, 'Escribi tu nombre').max(120).trim(),
  telefono: z.string().max(30).trim().optional(),
  nombreTaller: z.string().min(2).max(120).trim().optional(),
});

const esquemaLogin = z.object({
  email: z.string().email('Ese correo no parece valido').toLowerCase().trim(),
  password: z.string().min(1, 'Escribi tu contrasena'),
});

const validar = (esquema, cuerpo) => {
  const r = esquema.safeParse(cuerpo);
  if (!r.success) {
    const detalles = Object.fromEntries(
      r.error.issues.map((i) => [i.path.join('.'), i.message])
    );
    throw errores.datosInvalidos('Revisa los datos del formulario', detalles);
  }
  return r.data;
};

// ── Helpers ──────────────────────────────────────────────────

/** Resuelve el taller principal del usuario para meterlo en el token. */
const tallerPrincipal = async (usuarioId) => {
  const m = await prisma.usuarioTaller.findFirst({
    where: { usuarioId },
    select: { tallerId: true },
    orderBy: { creadoEn: 'asc' },
  });
  return m?.tallerId ?? null;
};

const responderConSesion = async (res, usuario) => {
  const tallerId = await tallerPrincipal(usuario.id);
  const accessToken = firmarAccessToken({ usuarioId: usuario.id, rol: usuario.rol, tallerId });
  const refresh = await emitirRefreshToken(usuario.id);

  res.cookie(COOKIE_REFRESH, refresh.token, opcionesCookie(refresh.expiraEn));

  return res.json({
    accessToken,
    usuario: {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol,
      tallerId,
    },
  });
};

// ── POST /registro ───────────────────────────────────────────
// Alta de productor con su taller. El admin no se crea por aca:
// se siembra o se promueve a mano desde la base.

rutasAuth.post('/registro', limitarIntentos, async (req, res) => {
  const datos = validar(esquemaRegistro, req.body);

  const yaExiste = await prisma.usuario.findUnique({ where: { email: datos.email } });
  if (yaExiste) throw errores.conflicto('Ya hay una cuenta con ese correo');

  const passwordHash = await bcrypt.hash(datos.password, 12);

  const usuario = await prisma.$transaction(async (tx) => {
    const u = await tx.usuario.create({
      data: {
        email: datos.email,
        passwordHash,
        nombre: datos.nombre,
        telefono: datos.telefono ?? null,
        rol: 'PRODUCTOR',
      },
    });

    const taller = await tx.taller.create({
      data: {
        nombre: datos.nombreTaller?.trim() || `Taller de ${datos.nombre}`,
        propietarioId: u.id,
      },
    });

    await tx.usuarioTaller.create({
      data: { usuarioId: u.id, tallerId: taller.id, rolEnTaller: 'PRODUCTOR' },
    });

    return u;
  });

  res.status(201);
  return responderConSesion(res, usuario);
});

// ── POST /login ──────────────────────────────────────────────

rutasAuth.post('/login', limitarIntentos, async (req, res) => {
  const { email, password } = validar(esquemaLogin, req.body);

  const usuario = await prisma.usuario.findUnique({ where: { email } });

  // Se compara igual aunque el usuario no exista, para que el tiempo de
  // respuesta no delate que correos estan registrados.
  const hashComparable = usuario?.passwordHash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
  const coincide = await bcrypt.compare(password, hashComparable);

  if (!usuario || !coincide) throw errores.credencialesInvalidas();
  if (!usuario.activo) throw errores.sinPermiso('Tu cuenta esta desactivada');

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { ultimoAcceso: new Date() },
  });

  return responderConSesion(res, usuario);
});

// ── POST /refresh ────────────────────────────────────────────
// Canjea la cookie por un access token nuevo y rota el refresh.

rutasAuth.post('/refresh', async (req, res) => {
  const token = req.cookies?.[COOKIE_REFRESH];
  const { usuario, refresh } = await rotarRefreshToken(token);

  const tallerId = await tallerPrincipal(usuario.id);
  const accessToken = firmarAccessToken({ usuarioId: usuario.id, rol: usuario.rol, tallerId });

  res.cookie(COOKIE_REFRESH, refresh.token, opcionesCookie(refresh.expiraEn));

  res.json({
    accessToken,
    usuario: {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol,
      tallerId,
    },
  });
});

// ── POST /logout ─────────────────────────────────────────────

rutasAuth.post('/logout', async (req, res) => {
  await revocarRefreshToken(req.cookies?.[COOKIE_REFRESH]);
  res.clearCookie(COOKIE_REFRESH, { ...opcionesCookie(new Date(0)), expires: undefined });
  res.json({ ok: true });
});

// ── GET /yo ──────────────────────────────────────────────────

rutasAuth.get('/yo', autenticar, async (req, res) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.usuario.usuarioId },
    select: {
      id: true,
      email: true,
      nombre: true,
      telefono: true,
      rol: true,
      activo: true,
      membresias: {
        select: {
          rolEnTaller: true,
          taller: { select: { id: true, nombre: true, distrito: true, enPiloto: true } },
        },
      },
    },
  });

  if (!usuario) throw errores.noEncontrado('El usuario');

  res.json({
    ...usuario,
    talleres: usuario.membresias.map((m) => ({ ...m.taller, rolEnTaller: m.rolEnTaller })),
    membresias: undefined,
  });
});
