// ============================================================
// RUTAS: ORDENES DE PRODUCCION
// ============================================================

import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { errores } from '../lib/errores.js';
import { autenticar } from '../middleware/auth.js';
import { conTaller, exigirTaller, scope, bloquearAyudante } from '../middleware/tenancy.js';
import { validar } from './materiales.js';
import { crearOrden, cambiarEstado, costearOrdenCompleta, explicarEstado } from '../services/ordenes.js';

export const rutasOrdenes = Router();

rutasOrdenes.use(autenticar, conTaller, exigirTaller);

const esquemaOrden = z.object({
  clienteNombre: z.string().max(120).trim().nullish(),
  fechaPedido: z.string().date('Fecha inválida').optional(),
  fechaEntrega: z.string().date('Fecha inválida').nullish(),
  notas: z.string().max(500).trim().nullish(),
  detalles: z
    .array(
      z.object({
        productoId: z.string().uuid('Elegí una prenda'),
        cantidad: z.coerce.number().int().positive('La cantidad tiene que ser al menos 1').max(100000),
        precioUnitarioVenta: z.coerce.number().min(0).optional(),
      })
    )
    .min(1, 'Agregá al menos una prenda a la orden'),
});

const esquemaEstado = z.object({
  estado: z.enum(['EN_PROCESO', 'TERMINADA', 'ENTREGADA', 'CANCELADA']),
  cantidadProducida: z.coerce.number().int().min(0).optional(),
});

const esquemaCosto = z.object({
  tipo: z.enum(['MATERIAL', 'MANO_OBRA', 'CIF']),
  descripcion: z.string().min(2, 'Describí el gasto').max(200).trim(),
  monto: z.coerce.number().positive('El monto tiene que ser mayor a 0').max(1_000_000),
  cantidad: z.coerce.number().positive().nullish(),
  fecha: z.string().date().optional(),
});

// ── GET / ────────────────────────────────────────────────────

rutasOrdenes.get('/', async (req, res) => {
  const { estado } = req.query;

  const ordenes = await prisma.ordenProduccion.findMany({
    where: { ...scope(req), ...(estado ? { estado } : {}) },
    orderBy: { numero: 'desc' },
    include: {
      detalles: { include: { producto: { select: { nombre: true, sku: true } } } },
      costos: { select: { tipo: true, monto: true } },
    },
    take: 200,
  });

  const esAyudante = req.usuario.rol === 'AYUDANTE' || req.rolEnTaller === 'AYUDANTE';

  const lista = ordenes.map((o) => {
    const planificadas = o.detalles.reduce((a, d) => a + d.cantidad, 0);
    const base = {
      id: o.id,
      numero: o.numero,
      estado: o.estado,
      explicacionEstado: explicarEstado(o.estado),
      clienteNombre: o.clienteNombre,
      fechaPedido: o.fechaPedido,
      fechaEntrega: o.fechaEntrega,
      cantidadPlanificada: planificadas,
      cantidadProducida: o.cantidadProducida,
      prendas: o.detalles.map((d) => ({
        nombre: d.producto.nombre,
        cantidad: d.cantidad,
      })),
    };

    // El ayudante ve qué hay que producir, no cuánto cuesta.
    if (esAyudante) return base;

    const costoTotal = Number(
      o.costos.reduce((a, c) => a + Number(c.monto), 0).toFixed(2)
    );
    const ventaTotal = Number(
      o.detalles.reduce((a, d) => a + Number(d.precioUnitarioVenta) * d.cantidad, 0).toFixed(2)
    );
    const unidades = o.cantidadProducida || planificadas;

    return {
      ...base,
      costoTotal,
      ventaTotal,
      costoUnitario: unidades > 0 ? Number((costoTotal / unidades).toFixed(2)) : 0,
      ganancia: Number((ventaTotal - costoTotal).toFixed(2)),
    };
  });

  res.json({
    ordenes: lista,
    resumen: {
      total: lista.length,
      enProceso: lista.filter((o) => o.estado === 'EN_PROCESO').length,
      terminadas: lista.filter((o) => o.estado === 'TERMINADA').length,
      borradores: lista.filter((o) => o.estado === 'BORRADOR').length,
    },
  });
});

// ── GET /:id/costeo ──────────────────────────────────────────

rutasOrdenes.get('/:id/costeo', bloquearAyudante, async (req, res) => {
  const datos = await costearOrdenCompleta({ tallerId: req.tallerId, ordenId: req.params.id });
  res.json(datos);
});

// ── POST / ───────────────────────────────────────────────────

rutasOrdenes.post('/', bloquearAyudante, async (req, res) => {
  const datos = validar(esquemaOrden, req.body);
  const orden = await crearOrden({ tallerId: req.tallerId, ...datos });
  res.status(201).json({ id: orden.id, numero: orden.numero, estado: orden.estado });
});

// ── PATCH /:id/estado ────────────────────────────────────────

rutasOrdenes.patch('/:id/estado', async (req, res) => {
  const { estado, cantidadProducida } = validar(esquemaEstado, req.body);

  // El ayudante puede avanzar la producción, no cancelar ni entregar.
  const esAyudante = req.usuario.rol === 'AYUDANTE' || req.rolEnTaller === 'AYUDANTE';
  if (esAyudante && !['EN_PROCESO', 'TERMINADA'].includes(estado)) {
    throw errores.sinPermiso('Solo el dueño del taller puede cancelar o entregar una orden');
  }

  const orden = await cambiarEstado({
    tallerId: req.tallerId,
    ordenId: req.params.id,
    nuevoEstado: estado,
    cantidadProducida,
  });

  res.json({
    id: orden.id,
    numero: orden.numero,
    estado: orden.estado,
    explicacionEstado: explicarEstado(orden.estado),
    cantidadProducida: orden.cantidadProducida,
  });
});

// ── POST /:id/costos ─────────────────────────────────────────
// Gastos que aparecen a mitad de la producción: horas extra, un
// insumo comprado de apuro, el arreglo de la máquina.

rutasOrdenes.post('/:id/costos', bloquearAyudante, async (req, res) => {
  const orden = await prisma.ordenProduccion.findFirst({
    where: { id: req.params.id, ...scope(req) },
  });
  if (!orden) throw errores.noEncontrado('La orden');
  if (['CANCELADA', 'ENTREGADA'].includes(orden.estado)) {
    throw errores.datosInvalidos('No se pueden agregar costos a una orden cerrada');
  }

  const datos = validar(esquemaCosto, req.body);

  const costo = await prisma.ordenCosto.create({
    data: {
      ordenId: orden.id,
      tipo: datos.tipo,
      descripcion: datos.descripcion,
      cantidad: datos.cantidad ?? null,
      monto: datos.monto,
      fecha: datos.fecha ? new Date(`${datos.fecha}T00:00:00Z`) : new Date(),
    },
  });

  res.status(201).json({ ...costo, monto: Number(costo.monto) });
});

// ── DELETE /:id ──────────────────────────────────────────────
// Solo borradores: una orden que ya tocó el inventario se cancela,
// no se borra, porque su historial sostiene el costeo.

rutasOrdenes.delete('/:id', bloquearAyudante, async (req, res) => {
  const orden = await prisma.ordenProduccion.findFirst({
    where: { id: req.params.id, ...scope(req) },
  });
  if (!orden) throw errores.noEncontrado('La orden');

  if (orden.estado !== 'BORRADOR') {
    throw errores.conflicto(
      'Esta orden ya movió inventario. Cancelala en vez de borrarla, así queda el registro de lo que pasó.'
    );
  }

  await prisma.$transaction([
    prisma.ordenDetalle.deleteMany({ where: { ordenId: orden.id } }),
    prisma.ordenProduccion.delete({ where: { id: orden.id } }),
  ]);

  res.json({ ok: true });
});
