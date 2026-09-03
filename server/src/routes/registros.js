// ============================================================
// RUTAS: INGRESOS, EGRESOS Y RETIROS
//
// El corazon del objetivo 4 (separacion de finanzas) y la fuente
// de casi todos los indicadores.
//
// Los campos calcan el cuaderno de papel: fecha, prenda, cantidad,
// precio. No es casualidad — un indicador de la tesis mide cuantos
// campos del sistema coinciden con los que el microempresario ya
// anota a mano.
// ============================================================

import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { errores } from '../lib/errores.js';
import { autenticar } from '../middleware/auth.js';
import { conTaller, exigirTaller, scope } from '../middleware/tenancy.js';
import { validar } from './materiales.js';
import { resultadoPeriodo } from 'shared/costeo';
import { moverStockProducto } from '../services/stockProducto.js';

export const rutasRegistros = Router();

rutasRegistros.use(autenticar, conTaller, exigirTaller);

// ── Validacion ───────────────────────────────────────────────

const esquemaRegistro = z
  .object({
    fecha: z.string().date('Elegi una fecha valida'),
    tipo: z.enum(['INGRESO', 'EGRESO', 'RETIRO']),
    categoriaId: z.string().uuid('Elegi una categoria'),
    descripcion: z.string().min(1, 'Escribi que fue este movimiento').max(200).trim(),
    monto: z.coerce.number().positive('El monto tiene que ser mayor a 0').max(1_000_000, 'Ese monto parece demasiado alto, revisalo'),
    origen: z.enum(['NEGOCIO', 'PERSONAL']).default('NEGOCIO'),
    productoId: z.string().uuid().nullish(),
    cantidad: z.coerce.number().positive().nullish(),
    precioUnitario: z.coerce.number().min(0).nullish(),
    metodoPago: z.string().max(40).trim().nullish(),
    ordenId: z.string().uuid().nullish(),
    esLineaBase: z.boolean().default(false),
  })
  .refine((d) => new Date(`${d.fecha}T00:00:00`) <= new Date(new Date().setHours(23, 59, 59, 999)), {
    message: 'No se puede registrar algo que todavia no paso',
    path: ['fecha'],
  })
  .refine(
    (d) => {
      // Si carga prenda y precio, cantidad por precio deberia dar el monto.
      if (!d.cantidad || !d.precioUnitario) return true;
      return Math.abs(d.cantidad * d.precioUnitario - d.monto) <= 0.5;
    },
    { message: 'La cantidad por el precio no coincide con el monto', path: ['monto'] }
  );

// ── GET / ────────────────────────────────────────────────────

rutasRegistros.get('/', async (req, res) => {
  const { desde, hasta, tipo, origen, incluirLineaBase } = req.query;

  const where = {
    ...scope(req),
    ...(tipo ? { tipo } : {}),
    ...(origen ? { origen } : {}),
    ...(incluirLineaBase === 'true' ? {} : { esLineaBase: false }),
    // Los anulados se siguen viendo en la lista, pero no suman:
    // el rastro queda, el efecto contable no.
    ...(req.query.incluirAnulados === 'true' ? {} : {}),
    ...(desde || hasta
      ? {
          fecha: {
            ...(desde ? { gte: new Date(desde) } : {}),
            ...(hasta ? { lte: new Date(hasta) } : {}),
          },
        }
      : {}),
  };

  const registros = await prisma.registro.findMany({
    where,
    orderBy: [{ fecha: 'desc' }, { creadoEn: 'desc' }],
    include: {
      categoria: { select: { id: true, nombre: true, esPersonal: true } },
      producto: { select: { id: true, nombre: true, sku: true } },
      creadoPor: { select: { id: true, nombre: true } },
      anuladoPor: { select: { id: true, nombre: true } },
    },
    take: 500,
  });

  const lista = registros.map((r) => ({
    ...r,
    monto: Number(r.monto),
    cantidad: r.cantidad != null ? Number(r.cantidad) : null,
    precioUnitario: r.precioUnitario != null ? Number(r.precioUnitario) : null,
  }));

  // Los totales se calculan con la misma formula que usa el motor
  // compartido, para que el servidor y la pantalla nunca discrepen.
  // Los anulados se excluyen del calculo pero siguen en la lista.
  const vigentes = lista.filter((r) => !r.anuladoEn);
  const totales = resultadoPeriodo(vigentes);

  const egresosPorCategoria = vigentes
    .filter((r) => r.tipo !== 'INGRESO')
    .reduce((acc, r) => {
      const k = r.categoria.nombre;
      acc[k] = Number(((acc[k] ?? 0) + r.monto).toFixed(2));
      return acc;
    }, {});

  res.json({
    registros: lista,
    totales,
    egresosPorCategoria,
    anulados: lista.length - vigentes.length,
  });
});

// ── POST / ───────────────────────────────────────────────────

rutasRegistros.post('/', async (req, res) => {
  const datos = validar(esquemaRegistro, req.body);

  // La categoria tiene que existir y ser global o de este taller.
  const categoria = await prisma.categoria.findFirst({
    where: { id: datos.categoriaId, OR: [{ tallerId: null }, { tallerId: req.tallerId }] },
  });
  if (!categoria) throw errores.datosInvalidos('Esa categoria no existe');
  if (categoria.tipo !== datos.tipo) {
    throw errores.datosInvalidos(
      `La categoria "${categoria.nombre}" no corresponde a un movimiento de tipo ${datos.tipo.toLowerCase()}`
    );
  }

  if (datos.productoId) {
    const p = await prisma.producto.findFirst({
      where: { id: datos.productoId, ...scope(req) },
    });
    if (!p) throw errores.datosInvalidos('Ese producto no existe en tu taller');
  }

  const registro = await prisma.registro.create({
    data: {
      tallerId: req.tallerId,
      fecha: new Date(`${datos.fecha}T00:00:00Z`),
      tipo: datos.tipo,
      categoriaId: datos.categoriaId,
      descripcion: datos.descripcion,
      monto: datos.monto,
      origen: datos.origen,
      productoId: datos.productoId ?? null,
      cantidad: datos.cantidad ?? null,
      precioUnitario: datos.precioUnitario ?? null,
      metodoPago: datos.metodoPago ?? null,
      ordenId: datos.ordenId ?? null,
      esLineaBase: datos.esLineaBase,
      creadoPorId: req.usuario.usuarioId,
    },
    include: { categoria: true, producto: { select: { id: true, nombre: true, sku: true } } },
  });

  // Si la venta indica prenda y cantidad, sale del stock: el
  // sistema tiene que saber que esas prendas ya no estan.
  if (datos.tipo === 'INGRESO' && datos.productoId && datos.cantidad > 0) {
    await moverStockProducto({
      tallerId: req.tallerId,
      productoId: datos.productoId,
      tipo: 'SALIDA',
      cantidad: datos.cantidad,
      motivo: `Venta: ${datos.descripcion}`,
      registroId: registro.id,
      fecha: registro.fecha,
    }).catch(() => {
      // Si falla el movimiento de stock no se cae la venta: el
      // registro financiero es lo que no se puede perder.
    });
  }

  // Alertas automaticas: la operativizacion de la tesis las cuenta
  // como indicador, asi que quedan registradas, no solo mostradas.
  const alertas = await generarAlertas(req.tallerId, datos);

  res.status(201).json({
    registro: { ...registro, monto: Number(registro.monto) },
    alertas,
  });
});

// ── POST /:id/anular ─────────────────────────────────────────
//
// Un movimiento mal cargado se ANULA, no se borra ni se edita.
//
// Es la practica contable correcta y ademas la unica defendible en
// una tesis: si los registros se pudieran editar, cualquier numero
// del capitulo de resultados seria cuestionable. Anulando, queda la
// fila original, quien la anulo y por que.

rutasRegistros.post('/:id/anular', async (req, res) => {
  const registro = await prisma.registro.findFirst({
    where: { id: req.params.id, ...scope(req) },
  });
  if (!registro) throw errores.noEncontrado('El registro');
  if (registro.anuladoEn) throw errores.conflicto('Ese movimiento ya estaba anulado');

  const motivo = String(req.body?.motivo ?? '').trim();
  if (motivo.length < 3) {
    throw errores.datosInvalidos('Escribí por qué lo anulás. Queda registrado.');
  }

  const anulado = await prisma.registro.update({
    where: { id: registro.id },
    data: {
      anuladoEn: new Date(),
      anuladoPorId: req.usuario.usuarioId,
      motivoAnulacion: motivo.slice(0, 200),
    },
  });

  // Si era una venta que descontó stock, las prendas vuelven.
  if (registro.tipo === 'INGRESO' && registro.productoId && Number(registro.cantidad) > 0) {
    await moverStockProducto({
      tallerId: req.tallerId,
      productoId: registro.productoId,
      tipo: 'ENTRADA',
      cantidad: Number(registro.cantidad),
      motivo: `Anulación: ${motivo}`,
      registroId: registro.id,
      fecha: registro.fecha,
    }).catch(() => {});
  }

  res.json({
    ok: true,
    anuladoEn: anulado.anuladoEn,
    mensaje: 'Movimiento anulado. Queda en la lista tachado, con el motivo.',
  });
});

// ── DELETE /:id ──────────────────────────────────────────────
// Solo lo cargado hoy y todavia sin anular: un error de tipeo
// recien hecho se borra, uno de la semana pasada se anula.

rutasRegistros.delete('/:id', async (req, res) => {
  const existe = await prisma.registro.findFirst({
    where: { id: req.params.id, ...scope(req) },
  });
  if (!existe) throw errores.noEncontrado('El registro');

  const horas = (Date.now() - existe.creadoEn.getTime()) / 3600000;
  if (horas > 24) {
    throw errores.conflicto(
      'Este movimiento tiene más de un día. Anulalo en vez de borrarlo, así queda el registro de qué pasó.'
    );
  }

  await prisma.registro.delete({ where: { id: existe.id } });
  res.json({ ok: true });
});

// ── GET /posible-duplicado ───────────────────────────────────
// Avisa, no bloquea: vender lo mismo dos veces en un dia es legitimo.

rutasRegistros.get('/posible-duplicado', async (req, res) => {
  const { fecha, monto, descripcion } = req.query;
  if (!fecha || !monto) return res.json({ duplicado: null });

  const encontrado = await prisma.registro.findFirst({
    where: {
      ...scope(req),
      fecha: new Date(`${fecha}T00:00:00Z`),
      monto: Number(monto),
      ...(descripcion ? { descripcion: { equals: descripcion.trim(), mode: 'insensitive' } } : {}),
    },
  });

  res.json({ duplicado: encontrado ? { ...encontrado, monto: Number(encontrado.monto) } : null });
});

// ── Alertas ──────────────────────────────────────────────────

async function generarAlertas(tallerId, datos) {
  const creadas = [];

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const delMes = await prisma.registro.findMany({
    where: { tallerId, fecha: { gte: inicioMes }, esLineaBase: false },
    select: { tipo: true, monto: true, origen: true },
  });

  const lista = delMes.map((r) => ({ ...r, monto: Number(r.monto) }));
  const t = resultadoPeriodo(lista);

  // "N de alertas automaticas (datos incorrectos, egreso > ingreso)"
  // es un indicador textual de la tabla de operativizacion.
  if (t.egresos + t.retiros > t.ingresos && t.ingresos > 0) {
    creadas.push(
      await prisma.alerta.create({
        data: {
          tallerId,
          tipo: 'egreso_mayor_ingreso',
          severidad: 'ADVERTENCIA',
          mensaje: `Este mes gastaste Bs. ${(t.egresos + t.retiros).toFixed(2)} y entraron Bs. ${t.ingresos.toFixed(2)}. Estas sacando mas de lo que entra.`,
        },
      })
    );
  }

  if (datos.origen === 'PERSONAL' && t.ingresos > 0) {
    const pct = (t.mezclaPersonal / t.ingresos) * 100;
    if (pct > 15) {
      creadas.push(
        await prisma.alerta.create({
          data: {
            tallerId,
            tipo: 'mezcla_personal_alta',
            severidad: 'ADVERTENCIA',
            mensaje: `Ya sacaste Bs. ${t.mezclaPersonal.toFixed(2)} de la caja del negocio para gastos personales: el ${pct.toFixed(0)} % de lo que entro este mes.`,
          },
        })
      );
    }
  }

  return creadas.map((a) => ({ id: a.id, tipo: a.tipo, mensaje: a.mensaje, severidad: a.severidad }));
}
