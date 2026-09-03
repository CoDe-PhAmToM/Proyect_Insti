// ============================================================
// ORDENES DE PRODUCCION
//
// Nucleo del objetivo especifico 3: costeo POR ORDENES.
//
// La diferencia con el costeo estandar por producto no es un
// detalle tecnico. El costeo estandar dice "una polera deberia
// costar 49,85". El costeo por ordenes dice "ESTAS 25 poleras
// costaron 1.326,25, o sea 53,05 cada una", porque la tela que se
// usó salió del inventario al precio que tenía ese día y la mano
// de obra fue la que realmente se pagó.
//
// Maquina de estados:
//
//   BORRADOR ──► EN_PROCESO ──► TERMINADA ──► ENTREGADA
//      │              │
//      └──────────────┴──► CANCELADA
//
//   BORRADOR    se arma el pedido, todavia no toca el inventario
//   EN_PROCESO  se descuenta la tela y se registra la mano de obra
//   TERMINADA   se sabe cuantas salieron bien y se prorratea el CIF
//   ENTREGADA   se cobra y queda ligada al ingreso
// ============================================================

import { prisma } from '../lib/prisma.js';
import { errores } from '../lib/errores.js';
import { consumirParaOrden, registrarMovimiento } from './kardex.js';
import { ingresarProduccion } from './stockProducto.js';
import { costearOrden, cifUnitario, costosFijosDelPeriodo } from 'shared/costeo';

const dec = (v) => Number(v ?? 0);
const red = (n, d = 2) => {
  const f = 10 ** d;
  return Math.round((n + Number.EPSILON) * f) / f;
};

// Transiciones permitidas. Todo lo que no este aca, se rechaza.
const TRANSICIONES = {
  BORRADOR: ['EN_PROCESO', 'CANCELADA'],
  EN_PROCESO: ['TERMINADA', 'CANCELADA'],
  TERMINADA: ['ENTREGADA'],
  ENTREGADA: [],
  CANCELADA: [],
};

const EXPLICACION = {
  BORRADOR: 'Todavia se puede editar. No se descontó material del inventario.',
  EN_PROCESO: 'Ya se descontó la tela y los insumos del inventario.',
  TERMINADA: 'Se sabe cuántas prendas salieron y ya tiene su costo real por unidad.',
  ENTREGADA: 'Entregada y cobrada.',
  CANCELADA: 'Cancelada. Si había material descontado, volvió al inventario.',
};

export const explicarEstado = (estado) => EXPLICACION[estado] ?? '';

const periodoDe = (fecha) => {
  const d = new Date(fecha);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

// ── Crear ────────────────────────────────────────────────────

export const crearOrden = async ({ tallerId, clienteNombre, fechaPedido, fechaEntrega, notas, detalles }) => {
  if (!detalles?.length) {
    throw errores.datosInvalidos('La orden necesita al menos una prenda');
  }

  // Todos los productos deben ser del taller y tener receta cargada:
  // sin receta no hay costo de materiales que acumular.
  const ids = [...new Set(detalles.map((d) => d.productoId))];
  const productos = await prisma.producto.findMany({
    where: { id: { in: ids }, tallerId },
    include: { receta: true },
  });

  if (productos.length !== ids.length) {
    throw errores.datosInvalidos('Alguna de las prendas no existe en tu taller');
  }
  const sinReceta = productos.find((p) => p.receta.length === 0);
  if (sinReceta) {
    throw errores.datosInvalidos(
      `"${sinReceta.nombre}" no tiene receta cargada. Cargale los materiales antes de producirlo.`
    );
  }

  return prisma.$transaction(async (tx) => {
    const ultima = await tx.ordenProduccion.findFirst({
      where: { tallerId },
      orderBy: { numero: 'desc' },
      select: { numero: true },
    });

    return tx.ordenProduccion.create({
      data: {
        tallerId,
        numero: (ultima?.numero ?? 0) + 1,
        clienteNombre: clienteNombre ?? null,
        fechaPedido: fechaPedido ? new Date(`${fechaPedido}T00:00:00Z`) : new Date(),
        fechaEntrega: fechaEntrega ? new Date(`${fechaEntrega}T00:00:00Z`) : null,
        notas: notas ?? null,
        detalles: {
          create: detalles.map((d) => {
            const p = productos.find((x) => x.id === d.productoId);
            return {
              productoId: d.productoId,
              cantidad: d.cantidad,
              precioUnitarioVenta: d.precioUnitarioVenta ?? p.precioVenta,
            };
          }),
        },
      },
      include: { detalles: { include: { producto: true } } },
    });
  });
};

// ── Cambio de estado ─────────────────────────────────────────

export const cambiarEstado = async ({ tallerId, ordenId, nuevoEstado, cantidadProducida }) => {
  const orden = await prisma.ordenProduccion.findFirst({
    where: { id: ordenId, tallerId },
    include: { detalles: { include: { producto: true } }, costos: true },
  });
  if (!orden) throw errores.noEncontrado('La orden');

  const permitidas = TRANSICIONES[orden.estado] ?? [];
  if (!permitidas.includes(nuevoEstado)) {
    throw errores.datosInvalidos(
      `Una orden ${orden.estado.toLowerCase().replace('_', ' ')} no puede pasar a ${nuevoEstado.toLowerCase().replace('_', ' ')}.`
    );
  }

  if (nuevoEstado === 'EN_PROCESO') return arrancarProduccion(orden, tallerId);
  if (nuevoEstado === 'TERMINADA') return terminarProduccion(orden, tallerId, cantidadProducida);
  if (nuevoEstado === 'CANCELADA') return cancelar(orden, tallerId);

  // ENTREGADA: solo marca, el ingreso se registra aparte
  return prisma.ordenProduccion.update({
    where: { id: orden.id },
    data: { estado: 'ENTREGADA' },
    include: { detalles: { include: { producto: true } }, costos: true },
  });
};

/**
 * BORRADOR -> EN_PROCESO
 * Descuenta del inventario lo que consume la orden y deja anotados
 * el costo real de materiales y la mano de obra.
 */
const arrancarProduccion = async (orden, tallerId) =>
  prisma.$transaction(async (tx) => {
    for (const d of orden.detalles) {
      const { costoTotal, consumos } = await consumirParaOrden({
        tallerId,
        ordenId: orden.id,
        productoId: d.productoId,
        cantidad: d.cantidad,
        fecha: orden.fechaPedido,
        tx,
      });

      for (const c of consumos) {
        await tx.ordenCosto.create({
          data: {
            ordenId: orden.id,
            tipo: 'MATERIAL',
            descripcion: `${c.nombre} — ${c.cantidad} para ${d.cantidad} ${d.producto.nombre}`,
            cantidad: c.cantidad,
            monto: c.costo,
            fecha: orden.fechaPedido,
          },
        });
      }

      const manoObra = red(dec(d.producto.manoObraUnitaria) * d.cantidad);
      if (manoObra > 0) {
        await tx.ordenCosto.create({
          data: {
            ordenId: orden.id,
            tipo: 'MANO_OBRA',
            descripcion: `Mano de obra — ${d.cantidad} ${d.producto.nombre}`,
            cantidad: d.cantidad,
            monto: manoObra,
            fecha: orden.fechaPedido,
          },
        });
      }

      void costoTotal;
    }

    return tx.ordenProduccion.update({
      where: { id: orden.id },
      data: { estado: 'EN_PROCESO' },
      include: { detalles: { include: { producto: true } }, costos: true },
    });
  });

/**
 * EN_PROCESO -> TERMINADA
 * Acá entra el prorrateo de costos indirectos. La base de reparto
 * son las unidades producidas en el mes, incluidas las de esta orden.
 */
const terminarProduccion = async (orden, tallerId, cantidadProducida) => {
  const planificadas = orden.detalles.reduce((a, d) => a + d.cantidad, 0);
  const producidas = cantidadProducida ?? planificadas;

  if (producidas <= 0) {
    throw errores.datosInvalidos('Poné cuántas prendas salieron bien');
  }
  if (producidas > planificadas * 2) {
    throw errores.datosInvalidos(
      `Ibas a hacer ${planificadas} y estás cargando ${producidas}. Revisá el número.`
    );
  }

  const periodo = periodoDe(orden.fechaPedido);
  const [anio, mes] = periodo.split('-').map(Number);
  const inicio = new Date(Date.UTC(anio, mes - 1, 1));
  const fin = new Date(Date.UTC(anio, mes, 0, 23, 59, 59));

  const [costosFijos, otras] = await Promise.all([
    prisma.costoFijo.findMany({ where: { tallerId } }),
    prisma.ordenProduccion.aggregate({
      where: {
        tallerId,
        id: { not: orden.id },
        estado: { in: ['TERMINADA', 'ENTREGADA'] },
        fechaPedido: { gte: inicio, lte: fin },
      },
      _sum: { cantidadProducida: true },
    }),
  ]);

  const fijosDelMes = costosFijosDelPeriodo(
    costosFijos.map((c) => ({ ...c, montoMensual: dec(c.montoMensual) })),
    periodo
  );
  const unidadesDelMes = (otras._sum.cantidadProducida ?? 0) + producidas;
  const cifPorUnidad = cifUnitario(fijosDelMes, unidadesDelMes);
  const cifDeLaOrden = red(cifPorUnidad * producidas);

  return prisma.$transaction(async (tx) => {
    // Se recalcula desde cero por si la orden se termina dos veces
    await tx.ordenCosto.deleteMany({ where: { ordenId: orden.id, tipo: 'CIF' } });

    if (cifDeLaOrden > 0) {
      await tx.ordenCosto.create({
        data: {
          ordenId: orden.id,
          tipo: 'CIF',
          descripcion: `Luz, alquiler y agua repartidos entre las ${unidadesDelMes} prendas del mes`,
          cantidad: producidas,
          monto: cifDeLaOrden,
          fecha: new Date(),
        },
      });
    }

    const terminada = await tx.ordenProduccion.update({
      where: { id: orden.id },
      data: { estado: 'TERMINADA', cantidadProducida: producidas },
      include: { detalles: { include: { producto: true } }, costos: true },
    });

    // Las prendas que salieron bien entran al stock de producto
    // terminado. Hasta ahora se producian y no aparecian en ningun
    // lado: el sistema sabia cuanto costaron pero no que existian.
    await ingresarProduccion({ tallerId, orden: terminada, tx });

    return terminada;
  });
};

/** Cancelar devuelve al inventario lo que se habia descontado. */
const cancelar = async (orden, tallerId) =>
  prisma.$transaction(async (tx) => {
    if (orden.estado === 'EN_PROCESO') {
      const consumos = await tx.movimientoMaterial.findMany({
        where: { ordenId: orden.id, tipo: 'SALIDA' },
      });

      for (const m of consumos) {
        await registrarMovimiento({
          tallerId,
          materialId: m.materialId,
          tipo: 'ENTRADA',
          cantidad: dec(m.cantidad),
          costoUnitario: dec(m.costoUnitario),
          motivo: `Devolución por cancelación de la orden N° ${orden.numero}`,
          tx,
        });
      }

      await tx.ordenCosto.deleteMany({ where: { ordenId: orden.id } });
    }

    return tx.ordenProduccion.update({
      where: { id: orden.id },
      data: { estado: 'CANCELADA' },
      include: { detalles: { include: { producto: true } }, costos: true },
    });
  });

// ── Costeo de una orden ──────────────────────────────────────

export const costearOrdenCompleta = async ({ tallerId, ordenId }) => {
  const orden = await prisma.ordenProduccion.findFirst({
    where: { id: ordenId, tallerId },
    include: {
      detalles: { include: { producto: true } },
      costos: { orderBy: [{ tipo: 'asc' }, { creadoEn: 'asc' }] },
    },
  });
  if (!orden) throw errores.noEncontrado('La orden');

  // Contexto del prorrateo. Sin esto el costo unitario parece
  // arbitrario: si el taller produjo poco en el mes, cada prenda
  // carga una porcion enorme del alquiler y la luz, y el resultado
  // asusta sin explicar por que. Es el efecto real de producir poco,
  // pero hay que decirlo, no mostrar un numero suelto.
  const periodo = periodoDe(orden.fechaPedido);
  const [anio, mes] = periodo.split('-').map(Number);
  const inicioMes = new Date(Date.UTC(anio, mes - 1, 1));
  const finMes = new Date(Date.UTC(anio, mes, 0, 23, 59, 59));

  const [fijos, producidoMes] = await Promise.all([
    prisma.costoFijo.findMany({ where: { tallerId } }),
    prisma.ordenProduccion.aggregate({
      where: {
        tallerId,
        estado: { in: ['TERMINADA', 'ENTREGADA'] },
        fechaPedido: { gte: inicioMes, lte: finMes },
      },
      _sum: { cantidadProducida: true },
    }),
  ]);

  const fijosDelMes = costosFijosDelPeriodo(
    fijos.map((c) => ({ ...c, montoMensual: dec(c.montoMensual) })),
    periodo
  );
  const unidadesDelMes = producidoMes._sum.cantidadProducida ?? 0;
  const cifPorUnidad = cifUnitario(fijosDelMes, unidadesDelMes);

  const sumaPorTipo = (tipo) =>
    red(orden.costos.filter((c) => c.tipo === tipo).reduce((a, c) => a + dec(c.monto), 0));

  const planificadas = orden.detalles.reduce((a, d) => a + d.cantidad, 0);
  const producidas = orden.cantidadProducida || planificadas;

  const costeo = costearOrden({
    costoMateriales: sumaPorTipo('MATERIAL'),
    costoManoObra: sumaPorTipo('MANO_OBRA'),
    costoCif: sumaPorTipo('CIF'),
    cantidadProducida: producidas,
  });

  const ventaTotal = red(
    orden.detalles.reduce((a, d) => a + dec(d.precioUnitarioVenta) * d.cantidad, 0)
  );
  const gananciaTotal = red(ventaTotal - costeo.costoTotal);

  return {
    orden: {
      id: orden.id,
      numero: orden.numero,
      estado: orden.estado,
      explicacionEstado: explicarEstado(orden.estado),
      clienteNombre: orden.clienteNombre,
      fechaPedido: orden.fechaPedido,
      fechaEntrega: orden.fechaEntrega,
      notas: orden.notas,
      cantidadPlanificada: planificadas,
      cantidadProducida: orden.cantidadProducida,
      detalles: orden.detalles.map((d) => ({
        id: d.id,
        productoId: d.productoId,
        nombre: d.producto.nombre,
        sku: d.producto.sku,
        cantidad: d.cantidad,
        precioUnitarioVenta: dec(d.precioUnitarioVenta),
      })),
    },
    costos: orden.costos.map((c) => ({
      id: c.id,
      tipo: c.tipo,
      descripcion: c.descripcion,
      cantidad: c.cantidad != null ? dec(c.cantidad) : null,
      monto: dec(c.monto),
    })),
    costeo,
    venta: {
      total: ventaTotal,
      unitario: producidas > 0 ? red(ventaTotal / producidas) : 0,
      gananciaTotal,
      gananciaUnitaria: producidas > 0 ? red(gananciaTotal / producidas) : 0,
    },
    // Las mermas se ven solas: si salieron menos de las planificadas
    merma:
      orden.estado === 'TERMINADA' || orden.estado === 'ENTREGADA'
        ? {
            unidades: planificadas - orden.cantidadProducida,
            costo: red(costeo.costoUnitario * (planificadas - orden.cantidadProducida)),
          }
        : null,

    // Por qué el gasto indirecto pesa lo que pesa
    prorrateo: {
      periodo,
      costosFijosMensuales: fijosDelMes,
      unidadesProducidasMes: unidadesDelMes,
      cifPorUnidad,
      // El aviso es el punto: producir poco no baja el alquiler, lo
      // reparte entre menos prendas. Verlo en numeros es media
      // solucion al problema que la tesis viene a atacar.
      aviso:
        unidadesDelMes > 0 && cifPorUnidad > costeo.costoVariableUnitario * 0.4
          ? `Este mes produjiste ${unidadesDelMes} prenda${unidadesDelMes !== 1 ? 's' : ''}, así que cada una carga Bs. ${cifPorUnidad.toFixed(2)} de alquiler, luz y agua. Produciendo más, ese peso baja: con 200 prendas sería Bs. ${(fijosDelMes / 200).toFixed(2)} cada una.`
          : null,
    },
  };
};
