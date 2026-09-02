// ============================================================
// RUTAS: MEDICION PARA LA TESIS
//
// Esto NO es una funcionalidad para el microempresario. Es la
// instrumentacion que permite escribir el capitulo de resultados.
//
// La tabla de operativizacion de variables del documento exige
// indicadores que ningun sistema mide solo:
//   - tiempo promedio en registrar una transaccion, semana 1 vs 3
//   - % de campos opcionales llenados (completitud)
//   - N de alertas automaticas generadas
//   - frecuencia de uso (registros por dia)
//
// Sin estas rutas, esos indicadores quedan sin datos y el capitulo
// de resultados no se puede escribir.
// ============================================================

import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { errores } from '../lib/errores.js';
import { autenticar, permitir } from '../middleware/auth.js';
import { conTaller, exigirTaller, scope } from '../middleware/tenancy.js';
import { validar } from './materiales.js';

export const rutasEventos = Router();
export const rutasLineaBase = Router();
export const rutasAdmin = Router();

// ══════════════════════════════════════════════════════════════
// BITACORA DE USO
// ══════════════════════════════════════════════════════════════

rutasEventos.use(autenticar);

const esquemaEvento = z.object({
  tipoEvento: z.string().min(2).max(60),
  entidad: z.string().max(60).nullish(),
  duracionMs: z.coerce.number().int().min(0).max(3_600_000).nullish(),
  metadata: z.record(z.string(), z.any()).nullish(),
});

// El cliente puede mandar varios eventos juntos para no hacer una
// peticion por cada clic.
rutasEventos.post('/', async (req, res) => {
  const cuerpo = Array.isArray(req.body) ? req.body : [req.body];
  if (cuerpo.length > 50) throw errores.datosInvalidos('Demasiados eventos en un solo envío');

  const eventos = cuerpo.map((e) => {
    const d = validar(esquemaEvento, e);
    return {
      usuarioId: req.usuario.usuarioId,
      tallerId: req.usuario.tallerId ?? null,
      tipoEvento: d.tipoEvento,
      entidad: d.entidad ?? null,
      duracionMs: d.duracionMs ?? null,
      metadata: d.metadata ?? null,
    };
  });

  await prisma.eventoUso.createMany({ data: eventos });
  res.status(201).json({ registrados: eventos.length });
});

// ══════════════════════════════════════════════════════════════
// LINEA BASE (pretest)
// ══════════════════════════════════════════════════════════════

rutasLineaBase.use(autenticar, conTaller, exigirTaller);

const esquemaLineaBase = z.object({
  periodo: z.string().regex(/^\d{4}-\d{2}$/, 'El período va en formato 2026-03'),
  ingresosDeclarados: z.coerce.number().min(0).max(10_000_000),
  egresosDeclarados: z.coerce.number().min(0).max(10_000_000),
  retirosDeclarados: z.coerce.number().min(0).max(10_000_000).default(0),
  costoUnitarioEstimado: z.coerce.number().min(0).nullish(),
  margenConocidoPct: z.coerce.number().min(0).max(100).nullish(),
  cifIdentificados: z.coerce.number().int().min(0).max(100).default(0),
  fuente: z.string().max(40).default('cuaderno'),
  notas: z.string().max(500).nullish(),
});

rutasLineaBase.get('/', async (req, res) => {
  const lineas = await prisma.lineaBase.findMany({
    where: scope(req),
    orderBy: { periodo: 'asc' },
  });

  res.json({
    lineasBase: lineas.map((l) => ({
      ...l,
      ingresosDeclarados: Number(l.ingresosDeclarados),
      egresosDeclarados: Number(l.egresosDeclarados),
      retirosDeclarados: Number(l.retirosDeclarados),
      costoUnitarioEstimado: l.costoUnitarioEstimado != null ? Number(l.costoUnitarioEstimado) : null,
      margenConocidoPct: l.margenConocidoPct != null ? Number(l.margenConocidoPct) : null,
    })),
    aviso:
      lineas.length === 0
        ? 'La línea base se carga UNA sola vez, antes de que el taller empiece a usar la plataforma, tomando los datos de su cuaderno. Es el punto de partida contra el que se mide el cambio.'
        : null,
  });
});

rutasLineaBase.post('/', async (req, res) => {
  const datos = validar(esquemaLineaBase, req.body);

  const existe = await prisma.lineaBase.findFirst({
    where: { ...scope(req), periodo: datos.periodo },
  });
  if (existe) {
    throw errores.conflicto(
      `Ya hay línea base cargada para ${datos.periodo}. Editala en vez de crear otra.`
    );
  }

  const linea = await prisma.lineaBase.create({
    data: { ...datos, tallerId: req.tallerId },
  });

  res.status(201).json(linea);
});

rutasLineaBase.delete('/:id', async (req, res) => {
  const existe = await prisma.lineaBase.findFirst({
    where: { id: req.params.id, ...scope(req) },
  });
  if (!existe) throw errores.noEncontrado('La línea base');

  await prisma.lineaBase.delete({ where: { id: existe.id } });
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════
// ADMIN: extraccion de datos del piloto
// ══════════════════════════════════════════════════════════════

rutasAdmin.use(autenticar, permitir('ADMIN'));

rutasAdmin.get('/talleres', async (_req, res) => {
  const talleres = await prisma.taller.findMany({
    where: { activo: true },
    orderBy: { creadoEn: 'asc' },
    include: {
      propietario: { select: { nombre: true, email: true } },
      _count: { select: { registros: true, ordenes: true, lineasBase: true } },
    },
  });

  res.json({
    talleres: talleres.map((t) => ({
      id: t.id,
      nombre: t.nombre,
      distrito: t.distrito,
      enPiloto: t.enPiloto,
      propietario: t.propietario.nombre,
      movimientos: t._count.registros,
      ordenes: t._count.ordenes,
      tieneLineaBase: t._count.lineasBase > 0,
      creadoEn: t.creadoEn,
    })),
    enPiloto: talleres.filter((t) => t.enPiloto).length,
  });
});

/**
 * Indicadores de uso por taller: lo que pide la tabla de
 * operativizacion. Sale anonimizado por defecto — los datos van a
 * un analisis estadistico, no hace falta el nombre de la persona.
 */
rutasAdmin.get('/indicadores-uso', async (req, res) => {
  const tallerId = req.query.tallerId ?? undefined;

  const [eventos, alertas, registros] = await Promise.all([
    prisma.eventoUso.findMany({
      where: { ...(tallerId ? { tallerId } : {}), duracionMs: { not: null } },
      select: { tallerId: true, tipoEvento: true, duracionMs: true, creadoEn: true },
    }),
    prisma.alerta.groupBy({
      by: ['tallerId', 'tipo'],
      where: tallerId ? { tallerId } : {},
      _count: true,
    }),
    prisma.registro.findMany({
      where: { ...(tallerId ? { tallerId } : {}), esLineaBase: false },
      select: { tallerId: true, creadoEn: true, productoId: true, cantidad: true, metodoPago: true },
    }),
  ]);

  // Tiempo de registro: primera semana contra tercera. Es el
  // indicador de curva de aprendizaje del documento.
  const deRegistro = eventos.filter((e) => e.tipoEvento === 'registro_creado');
  const porTaller = new Map();

  for (const e of deRegistro) {
    if (!porTaller.has(e.tallerId)) porTaller.set(e.tallerId, []);
    porTaller.get(e.tallerId).push(e);
  }

  const curvaAprendizaje = [...porTaller.entries()].map(([id, evs]) => {
    const orden = evs.sort((a, b) => a.creadoEn - b.creadoEn);
    const inicio = orden[0].creadoEn;
    const semana = (e) => Math.floor((e.creadoEn - inicio) / (7 * 24 * 3600 * 1000)) + 1;

    const prom = (n) => {
      const s = orden.filter((e) => semana(e) === n);
      return s.length ? Math.round(s.reduce((a, e) => a + e.duracionMs, 0) / s.length / 1000) : null;
    };

    return {
      tallerId: id,
      segundosSemana1: prom(1),
      segundosSemana3: prom(3),
      totalRegistros: orden.length,
    };
  });

  // Completitud: cuantos registros llenaron los campos opcionales
  const completitud = registros.length
    ? Math.round(
        (registros.filter((r) => r.productoId || r.cantidad || r.metodoPago).length /
          registros.length) *
          100
      )
    : 0;

  res.json({
    curvaAprendizaje,
    alertasPorTipo: alertas.map((a) => ({ tallerId: a.tallerId, tipo: a.tipo, cantidad: a._count })),
    totalAlertas: alertas.reduce((a, x) => a + x._count, 0),
    completitudPct: completitud,
    totalRegistros: registros.length,
    aviso:
      deRegistro.length === 0
        ? 'Todavía no hay eventos de uso registrados. Se acumulan a medida que los talleres usan la plataforma.'
        : null,
  });
});

/**
 * Exportacion CSV para el analisis estadistico (Wilcoxon).
 * Una fila por taller y periodo, con la fuente indicada.
 */
rutasAdmin.get('/export', async (req, res) => {
  const tallerId = req.query.tallerId ?? undefined;

  const [lineasBase, registros, talleres] = await Promise.all([
    prisma.lineaBase.findMany({ where: tallerId ? { tallerId } : {} }),
    prisma.registro.findMany({
      where: { ...(tallerId ? { tallerId } : {}), esLineaBase: false },
      select: { tallerId: true, fecha: true, tipo: true, monto: true },
    }),
    prisma.taller.findMany({ select: { id: true, enPiloto: true } }),
  ]);

  const anonimo = new Map(talleres.map((t, i) => [t.id, `T${String(i + 1).padStart(2, '0')}`]));
  const enPiloto = new Map(talleres.map((t) => [t.id, t.enPiloto]));

  const filas = [];

  for (const l of lineasBase) {
    filas.push({
      taller: anonimo.get(l.tallerId),
      enPiloto: enPiloto.get(l.tallerId) ? 1 : 0,
      periodo: l.periodo,
      momento: 'pre',
      fuente: l.fuente,
      ingresos: Number(l.ingresosDeclarados),
      egresos: Number(l.egresosDeclarados),
      retiros: Number(l.retirosDeclarados),
      ganancia: Number(l.ingresosDeclarados) - Number(l.egresosDeclarados) - Number(l.retirosDeclarados),
      margenConocidoPct: l.margenConocidoPct != null ? Number(l.margenConocidoPct) : '',
      cifIdentificados: l.cifIdentificados,
    });
  }

  const agrupado = registros.reduce((acc, r) => {
    const k = `${r.tallerId}|${r.fecha.toISOString().slice(0, 7)}`;
    acc[k] ??= { ingresos: 0, egresos: 0, retiros: 0 };
    const campo = r.tipo === 'INGRESO' ? 'ingresos' : r.tipo === 'EGRESO' ? 'egresos' : 'retiros';
    acc[k][campo] += Number(r.monto);
    return acc;
  }, {});

  for (const [k, v] of Object.entries(agrupado)) {
    const [id, periodo] = k.split('|');
    filas.push({
      taller: anonimo.get(id),
      enPiloto: enPiloto.get(id) ? 1 : 0,
      periodo,
      momento: 'post',
      fuente: 'plataforma',
      ingresos: Number(v.ingresos.toFixed(2)),
      egresos: Number(v.egresos.toFixed(2)),
      retiros: Number(v.retiros.toFixed(2)),
      ganancia: Number((v.ingresos - v.egresos - v.retiros).toFixed(2)),
      margenConocidoPct: '',
      cifIdentificados: '',
    });
  }

  filas.sort((a, b) => a.taller.localeCompare(b.taller) || a.periodo.localeCompare(b.periodo));

  const cols = Object.keys(filas[0] ?? { taller: '', periodo: '', momento: '' });
  const csv = [
    cols.join(','),
    ...filas.map((f) => cols.map((c) => `"${String(f[c] ?? '')}"`).join(',')),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="piloto-gestione.csv"');
  // BOM para que Excel abra bien los acentos
  res.send('﻿' + csv);
});
