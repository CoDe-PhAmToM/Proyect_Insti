// ============================================================
// RUTAS: COSTOS FIJOS MENSUALES
//
// Sin esta tabla no existe el punto de equilibrio. Ademas es la
// base del prorrateo de costos indirectos: la luz y el alquiler
// dejan de ser un numero que el usuario escribe a mano y pasan a
// repartirse solos entre lo que se produjo.
// ============================================================

import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { errores } from '../lib/errores.js';
import { autenticar } from '../middleware/auth.js';
import { conTaller, exigirTaller, scope, bloquearAyudante } from '../middleware/tenancy.js';
import { validar } from './materiales.js';
import { costosFijosDelPeriodo, cifUnitario } from 'shared/costeo';

export const rutasCostosFijos = Router();

rutasCostosFijos.use(autenticar, conTaller, exigirTaller, bloquearAyudante);

const esquema = z.object({
  concepto: z.string().min(2, 'Escribi que gasto es').max(120).trim(),
  montoMensual: z.coerce.number().positive('El monto tiene que ser mayor a 0').max(1_000_000),
  vigenteDesde: z.string().date('Fecha invalida').optional(),
  vigenteHasta: z.string().date('Fecha invalida').nullish(),
});

const aNumero = (c) => ({
  ...c,
  montoMensual: Number(c.montoMensual),
});

const periodoActual = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

rutasCostosFijos.get('/', async (req, res) => {
  const periodo = req.query.periodo ?? periodoActual();

  const costos = await prisma.costoFijo.findMany({
    where: scope(req),
    orderBy: { montoMensual: 'desc' },
  });

  const lista = costos.map(aNumero);
  const totalVigente = costosFijosDelPeriodo(lista, periodo);

  // Cuantas unidades se produjeron en el mes: es la base de reparto
  // del costo indirecto.
  const [anio, mes] = periodo.split('-').map(Number);
  const inicio = new Date(Date.UTC(anio, mes - 1, 1));
  const fin = new Date(Date.UTC(anio, mes, 0, 23, 59, 59));

  const producido = await prisma.ordenProduccion.aggregate({
    where: {
      ...scope(req),
      estado: { in: ['TERMINADA', 'ENTREGADA'] },
      fechaPedido: { gte: inicio, lte: fin },
    },
    _sum: { cantidadProducida: true },
  });

  const unidades = producido._sum.cantidadProducida ?? 0;

  res.json({
    costosFijos: lista,
    periodo,
    totalMensual: totalVigente,
    unidadesProducidas: unidades,
    cifUnitario: cifUnitario(totalVigente, unidades),
    // Sin produccion registrada no se puede prorratear: se dice, no
    // se inventa un numero.
    aviso: unidades === 0
      ? 'Todavia no hay ordenes terminadas este mes, asi que el gasto indirecto por prenda no se puede repartir.'
      : null,
  });
});

rutasCostosFijos.post('/', async (req, res) => {
  const datos = validar(esquema, req.body);

  const costo = await prisma.costoFijo.create({
    data: {
      tallerId: req.tallerId,
      concepto: datos.concepto,
      montoMensual: datos.montoMensual,
      vigenteDesde: datos.vigenteDesde ? new Date(datos.vigenteDesde) : new Date(),
      vigenteHasta: datos.vigenteHasta ? new Date(datos.vigenteHasta) : null,
    },
  });

  res.status(201).json(aNumero(costo));
});

rutasCostosFijos.patch('/:id', async (req, res) => {
  const existe = await prisma.costoFijo.findFirst({
    where: { id: req.params.id, ...scope(req) },
  });
  if (!existe) throw errores.noEncontrado('El costo fijo');

  const datos = validar(esquema.partial(), req.body);

  const costo = await prisma.costoFijo.update({
    where: { id: existe.id },
    data: {
      ...datos,
      ...(datos.vigenteDesde ? { vigenteDesde: new Date(datos.vigenteDesde) } : {}),
      ...(datos.vigenteHasta !== undefined
        ? { vigenteHasta: datos.vigenteHasta ? new Date(datos.vigenteHasta) : null }
        : {}),
    },
  });

  res.json(aNumero(costo));
});

rutasCostosFijos.delete('/:id', async (req, res) => {
  const existe = await prisma.costoFijo.findFirst({
    where: { id: req.params.id, ...scope(req) },
  });
  if (!existe) throw errores.noEncontrado('El costo fijo');

  await prisma.costoFijo.delete({ where: { id: existe.id } });
  res.json({ ok: true });
});
