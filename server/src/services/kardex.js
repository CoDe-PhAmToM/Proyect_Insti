// ============================================================
// KARDEX DE MATERIALES
//
// Metodo: PROMEDIO PONDERADO.
//
// Se elige sobre PEPS porque es el que un microempresario puede
// entender y sostener: "el metro de tela me sale en promedio a
// tanto". Con PEPS habria que rastrear lotes, y en un taller donde
// la tela se corta de varios rollos a la vez eso no refleja como
// trabajan de verdad.
//
// Cada movimiento congela el saldo en cantidad y en valor. Asi el
// reporte de kardex se arma leyendo filas, sin recalcular toda la
// historia, y una salida vieja conserva el costo que tenia ese dia
// aunque el precio haya cambiado despues.
// ============================================================

import { prisma } from '../lib/prisma.js';
import { errores } from '../lib/errores.js';

const dec = (v) => Number(v ?? 0);
const red = (n, d = 4) => {
  const f = 10 ** d;
  return Math.round((n + Number.EPSILON) * f) / f;
};

/** Ultimo saldo del material. Si no hubo movimientos, arranca en cero. */
const ultimoSaldo = async (tx, materialId) => {
  const ultimo = await tx.movimientoMaterial.findFirst({
    where: { materialId },
    orderBy: [{ fecha: 'desc' }, { creadoEn: 'desc' }],
    select: { saldoCantidad: true, saldoValor: true },
  });
  return {
    cantidad: dec(ultimo?.saldoCantidad),
    valor: dec(ultimo?.saldoValor),
  };
};

/** Costo promedio actual: valor del saldo dividido las unidades. */
export const costoPromedio = (saldo) =>
  saldo.cantidad > 0 ? red(saldo.valor / saldo.cantidad) : 0;

/**
 * Registra un movimiento y actualiza el stock del material.
 * Todo dentro de una transaccion: o entra el movimiento y cambia el
 * stock, o no pasa nada. Nunca a medias.
 *
 * @param {'ENTRADA'|'SALIDA'|'AJUSTE'} tipo
 */
export const registrarMovimiento = async ({
  tallerId,
  materialId,
  tipo,
  cantidad,
  costoUnitario = null,
  fecha,
  motivo = null,
  ordenId = null,
  tx: txExterna = null,
}) => {
  const ejecutar = async (tx) => {
    const material = await tx.material.findFirst({
      where: { id: materialId, tallerId },
    });
    if (!material) throw errores.noEncontrado('El material');

    const cant = dec(cantidad);
    if (cant <= 0) throw errores.datosInvalidos('La cantidad tiene que ser mayor a 0');

    const saldo = await ultimoSaldo(tx, materialId);
    let nuevaCantidad;
    let nuevoValor;
    let costoDelMovimiento;

    if (tipo === 'ENTRADA') {
      // Una compra entra a su precio real y mueve el promedio.
      costoDelMovimiento = costoUnitario != null ? dec(costoUnitario) : dec(material.precioUnitario);
      nuevaCantidad = red(saldo.cantidad + cant);
      nuevoValor = red(saldo.valor + cant * costoDelMovimiento, 2);
    } else if (tipo === 'SALIDA') {
      if (cant > saldo.cantidad) {
        throw errores.datosInvalidos(
          `No hay suficiente ${material.nombre}. Quedan ${saldo.cantidad} ${material.unidad} y se quieren sacar ${cant}.`
        );
      }
      // La salida se valoriza al promedio del momento, no al precio de hoy.
      costoDelMovimiento = costoPromedio(saldo);
      nuevaCantidad = red(saldo.cantidad - cant);
      nuevoValor = red(saldo.valor - cant * costoDelMovimiento, 2);
    } else if (tipo === 'AJUSTE') {
      // Conteo fisico: la cantidad pasada es el stock real contado.
      costoDelMovimiento = costoPromedio(saldo) || dec(material.precioUnitario);
      nuevaCantidad = cant;
      nuevoValor = red(cant * costoDelMovimiento, 2);
    } else {
      throw errores.datosInvalidos(`Tipo de movimiento desconocido: ${tipo}`);
    }

    const movimiento = await tx.movimientoMaterial.create({
      data: {
        materialId,
        tipo,
        cantidad: cant,
        costoUnitario: costoDelMovimiento,
        saldoCantidad: nuevaCantidad,
        saldoValor: nuevoValor,
        ordenId,
        motivo,
        fecha: fecha ? new Date(fecha) : new Date(),
      },
    });

    // El stock del material es un espejo del ultimo saldo del kardex.
    // El promedio ponderado nuevo pasa a ser su precio de referencia.
    const material2 = await tx.material.update({
      where: { id: materialId },
      data: {
        stock: nuevaCantidad,
        precioUnitario: nuevaCantidad > 0 ? red(nuevoValor / nuevaCantidad) : dec(material.precioUnitario),
      },
    });

    return { movimiento, material: material2 };
  };

  return txExterna ? ejecutar(txExterna) : prisma.$transaction(ejecutar);
};

/**
 * Kardex de un material en un rango de fechas, ya con el formato de
 * un reporte contable: entradas, salidas y saldo corrido.
 */
export const obtenerKardex = async ({ tallerId, materialId, desde, hasta }) => {
  const material = await prisma.material.findFirst({
    where: { id: materialId, tallerId },
  });
  if (!material) throw errores.noEncontrado('El material');

  const movimientos = await prisma.movimientoMaterial.findMany({
    where: {
      materialId,
      ...(desde || hasta
        ? {
            fecha: {
              ...(desde ? { gte: new Date(desde) } : {}),
              ...(hasta ? { lte: new Date(hasta) } : {}),
            },
          }
        : {}),
    },
    orderBy: [{ fecha: 'asc' }, { creadoEn: 'asc' }],
    include: {
      orden: { select: { numero: true } },
    },
  });

  const filas = movimientos.map((m) => ({
    id: m.id,
    fecha: m.fecha,
    tipo: m.tipo,
    motivo: m.motivo ?? (m.orden ? `Orden N° ${m.orden.numero}` : null),
    entrada: m.tipo === 'ENTRADA' ? dec(m.cantidad) : null,
    salida: m.tipo === 'SALIDA' ? dec(m.cantidad) : null,
    costoUnitario: dec(m.costoUnitario),
    saldoCantidad: dec(m.saldoCantidad),
    saldoValor: dec(m.saldoValor),
    costoPromedio: dec(m.saldoCantidad) > 0 ? red(dec(m.saldoValor) / dec(m.saldoCantidad)) : 0,
  }));

  return {
    material: {
      id: material.id,
      codigo: material.codigo,
      nombre: material.nombre,
      unidad: material.unidad,
    },
    filas,
    resumen: {
      totalEntradas: red(filas.reduce((a, f) => a + (f.entrada ?? 0), 0)),
      totalSalidas: red(filas.reduce((a, f) => a + (f.salida ?? 0), 0)),
      saldoFinal: filas.at(-1)?.saldoCantidad ?? 0,
      valorFinal: filas.at(-1)?.saldoValor ?? 0,
    },
  };
};

/**
 * Descuenta del inventario los materiales que consume una orden,
 * segun la receta del producto y la cantidad a producir.
 * Devuelve el costo real de materiales, que alimenta el costeo.
 */
export const consumirParaOrden = async ({ tallerId, ordenId, productoId, cantidad, fecha, tx }) => {
  const receta = await tx.productoMaterial.findMany({
    where: { productoId },
    include: { material: true },
  });

  if (receta.length === 0) {
    throw errores.datosInvalidos(
      'Ese producto no tiene receta cargada. Cargale los materiales antes de producirlo.'
    );
  }

  let costoTotal = 0;
  const consumos = [];

  for (const item of receta) {
    const aConsumir = red(dec(item.cantidad) * dec(cantidad));
    const { movimiento } = await registrarMovimiento({
      tallerId,
      materialId: item.materialId,
      tipo: 'SALIDA',
      cantidad: aConsumir,
      fecha,
      ordenId,
      motivo: null,
      tx,
    });

    const costo = red(dec(movimiento.cantidad) * dec(movimiento.costoUnitario), 2);
    costoTotal = red(costoTotal + costo, 2);
    consumos.push({
      materialId: item.materialId,
      nombre: item.material.nombre,
      cantidad: aConsumir,
      costoUnitario: dec(movimiento.costoUnitario),
      costo,
    });
  }

  return { costoTotal, consumos };
};
