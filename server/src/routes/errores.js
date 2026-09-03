// ============================================================
// RUTAS: REGISTRO DE ERRORES EN PRODUCCION
//
// Sin esto, si algo falla en el celular de una microempresaria del
// Distrito 6 el equipo NO se entera nunca. Ella cree que hizo algo
// mal, deja de usar el sistema, y el piloto pierde un caso sin que
// nadie sepa por que.
//
// Con 3 a 15 talleres, cada caso perdido pesa entre el 7 % y el
// 33 % de la muestra. Enterarse de los errores no es higiene de
// desarrollo: es proteger los datos de la tesis.
// ============================================================

import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { errores } from '../lib/errores.js';
import { autenticar, permitir, autenticarOpcional } from '../middleware/auth.js';
import { validar } from './materiales.js';

export const rutasErrores = Router();

const esquema = z.object({
  mensaje: z.string().min(1).max(500),
  pila: z.string().max(4000).nullish(),
  ruta: z.string().max(200).nullish(),
  metadata: z.record(z.string(), z.any()).nullish(),
});

// ── POST / — lo reporta el navegador ─────────────────────────
// Sin autenticacion obligatoria: un error puede pasar justamente
// cuando la sesion fallo, y ese es el caso que mas importa ver.

rutasErrores.post('/', autenticarOpcional, async (req, res) => {
  const datos = validar(esquema, req.body);

  await prisma.errorApp.create({
    data: {
      origen: 'cliente',
      mensaje: datos.mensaje,
      pila: datos.pila ?? null,
      ruta: datos.ruta ?? null,
      usuarioId: req.usuario?.usuarioId ?? null,
      tallerId: req.usuario?.tallerId ?? null,
      navegador: req.get('user-agent')?.slice(0, 300) ?? null,
      metadata: datos.metadata ?? null,
    },
  });

  // Siempre 204: reportar un error nunca debe generar otro error.
  res.status(204).end();
});

// ── GET / — solo el equipo investigador ──────────────────────

rutasErrores.get('/', autenticar, permitir('ADMIN'), async (req, res) => {
  const soloAbiertos = req.query.resueltos !== 'true';

  const lista = await prisma.errorApp.findMany({
    where: soloAbiertos ? { resuelto: false } : {},
    orderBy: { creadoEn: 'desc' },
    take: 200,
    include: { usuario: { select: { nombre: true, rol: true } } },
  });

  // Se agrupan por mensaje: 40 veces el mismo error es UN problema,
  // no 40. Ver la lista cruda esconde cual es el que mas duele.
  const porMensaje = lista.reduce((acc, e) => {
    acc[e.mensaje] ??= { mensaje: e.mensaje, veces: 0, ultimo: e.creadoEn, rutas: new Set(), ids: [] };
    acc[e.mensaje].veces++;
    acc[e.mensaje].ids.push(e.id);
    if (e.ruta) acc[e.mensaje].rutas.add(e.ruta);
    return acc;
  }, {});

  res.json({
    errores: lista.map((e) => ({
      id: e.id,
      origen: e.origen,
      mensaje: e.mensaje,
      ruta: e.ruta,
      usuario: e.usuario?.nombre ?? 'sin sesión',
      rol: e.usuario?.rol ?? null,
      creadoEn: e.creadoEn,
    })),
    agrupados: Object.values(porMensaje)
      .map((g) => ({ ...g, rutas: [...g.rutas] }))
      .sort((a, b) => b.veces - a.veces),
    total: lista.length,
    aviso: lista.length === 0 ? 'Sin errores registrados. Buena señal.' : null,
  });
});

// ── POST /:id/resolver ───────────────────────────────────────

rutasErrores.post('/resolver', autenticar, permitir('ADMIN'), async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  if (ids.length === 0) throw errores.datosInvalidos('No indicaste qué marcar como resuelto');

  const r = await prisma.errorApp.updateMany({
    where: { id: { in: ids } },
    data: { resuelto: true },
  });

  res.json({ ok: true, marcados: r.count });
});
