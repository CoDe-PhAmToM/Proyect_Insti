// ============================================================
// STOCK DE PRODUCTO TERMINADO
//
// Distinto del inventario de materiales: una cosa es tener tela,
// otra es tener poleras hechas.
//
// Sin esto pasaban dos cosas:
//  - La tienda vendia infinito: un cliente podia pedir 500 poleras
//    a un taller que tenia 3.
//  - La recomendacion "producto sin rotacion, tenes stock parado"
//    hablaba de un stock que el sistema no conocia. Era la unica
//    recomendacion del motor que no podia respaldar con datos.
//
// Entra cuando se termina una orden. Sale cuando se vende.
// ============================================================

import { prisma } from '../lib/prisma.js';
import { errores } from '../lib/errores.js';

/**
 * Registra un movimiento de prendas terminadas y actualiza el saldo.
 *
 * @param {'ENTRADA'|'SALIDA'|'AJUSTE'} tipo
 */
export const moverStockProducto = async ({
  tallerId,
  productoId,
  tipo,
  cantidad,
  motivo = null,
  ordenId = null,
  registroId = null,
  fecha = new Date(),
  tx: txExterna = null,
}) => {
  const ejecutar = async (tx) => {
    const producto = await tx.producto.findFirst({ where: { id: productoId, tallerId } });
    if (!producto) throw errores.noEncontrado('El producto');

    const cant = Math.round(Number(cantidad));
    if (cant <= 0) throw errores.datosInvalidos('La cantidad tiene que ser mayor a 0');

    let saldo;
    if (tipo === 'ENTRADA') {
      saldo = producto.stock + cant;
    } else if (tipo === 'SALIDA') {
      // No se bloquea vender mas de lo que hay: en un taller a
      // pedido es normal vender algo que todavia se va a hacer. Se
      // permite el saldo negativo y la pantalla lo muestra en rojo,
      // que es informacion util en vez de una traba.
      saldo = producto.stock - cant;
    } else {
      saldo = cant; // AJUSTE: conteo fisico
    }

    const movimiento = await tx.movimientoProducto.create({
      data: {
        productoId,
        tipo,
        cantidad: cant,
        saldo,
        ordenId,
        registroId,
        motivo,
        fecha: new Date(fecha),
      },
    });

    const actualizado = await tx.producto.update({
      where: { id: productoId },
      data: { stock: saldo },
    });

    return { movimiento, producto: actualizado };
  };

  return txExterna ? ejecutar(txExterna) : prisma.$transaction(ejecutar);
};

/**
 * Al terminar una orden entran las prendas que salieron bien.
 * Se reparten proporcionalmente entre los productos de la orden
 * cuando lleva mas de uno.
 */
export const ingresarProduccion = async ({ tallerId, orden, tx }) => {
  const planificadas = orden.detalles.reduce((a, d) => a + d.cantidad, 0);
  const producidas = orden.cantidadProducida;
  if (producidas <= 0 || planificadas <= 0) return [];

  const entradas = [];
  let repartidas = 0;

  for (const [i, d] of orden.detalles.entries())  {
    // La ultima linea se lleva el resto, para que la suma cierre
    // exacta aunque el reparto proporcional deje decimales.
    const esUltima = i === orden.detalles.length - 1;
    const cantidad = esUltima
      ? producidas - repartidas
      : Math.round((d.cantidad / planificadas) * producidas);

    if (cantidad <= 0) continue;
    repartidas += cantidad;

    const { producto } = await moverStockProducto({
      tallerId,
      productoId: d.productoId,
      tipo: 'ENTRADA',
      cantidad,
      motivo: `Producción de la orden N° ${orden.numero}`,
      ordenId: orden.id,
      fecha: orden.fechaPedido,
      tx,
    });

    entradas.push({ productoId: d.productoId, cantidad, stockNuevo: producto.stock });
  }

  return entradas;
};

/** Historial de una prenda: cuántas entraron, cuántas salieron. */
export const historialProducto = async ({ tallerId, productoId }) => {
  const producto = await prisma.producto.findFirst({ where: { id: productoId, tallerId } });
  if (!producto) throw errores.noEncontrado('El producto');

  const movimientos = await prisma.movimientoProducto.findMany({
    where: { productoId },
    orderBy: [{ fecha: 'asc' }, { creadoEn: 'asc' }],
  });

  return {
    producto: { id: producto.id, nombre: producto.nombre, sku: producto.sku, stock: producto.stock },
    movimientos,
    resumen: {
      producidas: movimientos.filter((m) => m.tipo === 'ENTRADA').reduce((a, m) => a + m.cantidad, 0),
      vendidas: movimientos.filter((m) => m.tipo === 'SALIDA').reduce((a, m) => a + m.cantidad, 0),
      stockActual: producto.stock,
    },
  };
};
