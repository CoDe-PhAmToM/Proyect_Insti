// ============================================================
// RUTAS: INDICADORES
//
// Punto de equilibrio y margen de contribucion — los dos que el
// objetivo especifico 3 nombra textualmente y que el prototipo no
// tenia.
//
// Todo sale en dos versiones: el numero, y una frase en castellano
// llano. El documento insiste en usuarios sin formacion contable:
// "punto de equilibrio: 34" no le dice nada a nadie, "tenes que
// vender 34 poleras al mes para no perder plata" si.
// ============================================================

import { Router } from 'express';

import { prisma } from '../lib/prisma.js';
import { autenticar } from '../middleware/auth.js';
import { conTaller, exigirTaller, scope, bloquearAyudante } from '../middleware/tenancy.js';
import {
  puntoEquilibrio,
  margenContribucion,
  margenBrutoPct,
  valorizarReceta,
  costosFijosDelPeriodo,
  cifUnitario,
} from 'shared/costeo';

export const rutasIndicadores = Router();

rutasIndicadores.use(autenticar, conTaller, exigirTaller, bloquearAyudante);

const dec = (v) => Number(v ?? 0);
const red = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const periodoActual = () => {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

const rangoDelPeriodo = (periodo) => {
  const [a, m] = periodo.split('-').map(Number);
  return {
    inicio: new Date(Date.UTC(a, m - 1, 1)),
    fin: new Date(Date.UTC(a, m, 0, 23, 59, 59)),
  };
};

// ── GET /punto-equilibrio ────────────────────────────────────

rutasIndicadores.get('/punto-equilibrio', async (req, res) => {
  const periodo = req.query.periodo ?? periodoActual();
  const { inicio, fin } = rangoDelPeriodo(periodo);

  const [productos, materiales, costosFijos, producido, vendido] = await Promise.all([
    prisma.producto.findMany({ where: { ...scope(req), activo: true }, include: { receta: true } }),
    prisma.material.findMany({ where: scope(req) }),
    prisma.costoFijo.findMany({ where: scope(req) }),
    prisma.ordenProduccion.aggregate({
      where: {
        ...scope(req),
        estado: { in: ['TERMINADA', 'ENTREGADA'] },
        fechaPedido: { gte: inicio, lte: fin },
      },
      _sum: { cantidadProducida: true },
    }),
    prisma.registro.aggregate({
      where: { ...scope(req), tipo: 'INGRESO', fecha: { gte: inicio, lte: fin }, esLineaBase: false },
      _sum: { monto: true, cantidad: true },
    }),
  ]);

  const mats = materiales.map((m) => ({ ...m, precioUnitario: dec(m.precioUnitario) }));
  const fijos = costosFijos.map((c) => ({ ...c, montoMensual: dec(c.montoMensual) }));
  const totalFijos = costosFijosDelPeriodo(fijos, periodo);
  const unidadesProducidas = producido._sum.cantidadProducida ?? 0;
  const ventasDelMes = red(dec(vendido._sum.monto));

  const porProducto = productos.map((p) => {
    const val = valorizarReceta(
      p.receta.map((r) => ({ materialId: r.materialId, cantidad: dec(r.cantidad) })),
      mats
    );
    // El costo variable es lo que cambia con cada prenda: materiales
    // y mano de obra. El alquiler no entra acá — se paga igual se
    // produzca una prenda o cien, y por eso va del otro lado.
    const costoVariable = red(val.subtotal + dec(p.manoObraUnitaria));
    const precio = dec(p.precioVenta);
    const mc = margenContribucion(precio, costoVariable);
    const pe = puntoEquilibrio(totalFijos, precio, costoVariable);

    return {
      id: p.id,
      nombre: p.nombre,
      sku: p.sku,
      precioVenta: precio,
      costoVariableUnitario: costoVariable,
      margenContribucionUnitario: mc,
      // Qué porcentaje de cada venta queda para cubrir los gastos fijos
      razonContribucion: precio > 0 ? red((mc / precio) * 100) : 0,
      puntoEquilibrio: pe,
      explicacion: pe.alcanzable
        ? `Tenés que vender ${pe.unidades} ${p.nombre.toLowerCase()} en el mes para no perder plata.`
        : pe.motivo,
    };
  });

  // El producto más fácil de sostener es el que necesita vender menos
  const alcanzables = porProducto.filter((p) => p.puntoEquilibrio.alcanzable);
  const masFacil = alcanzables.length
    ? alcanzables.reduce((a, b) => (a.puntoEquilibrio.unidades <= b.puntoEquilibrio.unidades ? a : b))
    : null;

  res.json({
    periodo,
    costosFijosMensuales: totalFijos,
    unidadesProducidas,
    ventasDelMes,
    cifUnitario: cifUnitario(totalFijos, unidadesProducidas),
    productos: porProducto,
    masFacil: masFacil
      ? { nombre: masFacil.nombre, unidades: masFacil.puntoEquilibrio.unidades }
      : null,
    // Si no hay gastos fijos cargados el cálculo no significa nada:
    // se dice, en vez de mostrar un punto de equilibrio de cero.
    aviso:
      totalFijos === 0
        ? 'Todavía no cargaste los gastos fijos del taller (alquiler, luz, agua). Sin eso no se puede calcular cuánto tenés que vender para no perder.'
        : null,
  });
});

// ── GET /rentabilidad-por-producto ───────────────────────────

rutasIndicadores.get('/rentabilidad-por-producto', async (req, res) => {
  const periodo = req.query.periodo ?? periodoActual();
  const { inicio, fin } = rangoDelPeriodo(periodo);

  const [productos, materiales, ventas] = await Promise.all([
    prisma.producto.findMany({ where: { ...scope(req), activo: true }, include: { receta: true } }),
    prisma.material.findMany({ where: scope(req) }),
    prisma.registro.groupBy({
      by: ['productoId'],
      where: {
        ...scope(req),
        tipo: 'INGRESO',
        productoId: { not: null },
        fecha: { gte: inicio, lte: fin },
        esLineaBase: false,
      },
      _sum: { monto: true, cantidad: true },
    }),
  ]);

  const mats = materiales.map((m) => ({ ...m, precioUnitario: dec(m.precioUnitario) }));
  const porProducto = new Map(ventas.map((v) => [v.productoId, v]));

  const filas = productos.map((p) => {
    const val = valorizarReceta(
      p.receta.map((r) => ({ materialId: r.materialId, cantidad: dec(r.cantidad) })),
      mats
    );
    const costoUnitario = red(val.subtotal + dec(p.manoObraUnitaria));
    const v = porProducto.get(p.id);
    const unidades = dec(v?._sum.cantidad);
    const ingreso = red(dec(v?._sum.monto));

    return {
      id: p.id,
      nombre: p.nombre,
      sku: p.sku,
      precioVenta: dec(p.precioVenta),
      costoUnitario,
      margenUnitario: red(dec(p.precioVenta) - costoUnitario),
      margenPct: margenBrutoPct(dec(p.precioVenta), costoUnitario),
      unidadesVendidas: unidades,
      ingresoTotal: ingreso,
      gananciaTotal: red(ingreso - costoUnitario * unidades),
      // Sin ventas registradas no se puede afirmar nada del producto
      sinDatos: unidades === 0,
    };
  });

  filas.sort((a, b) => b.gananciaTotal - a.gananciaTotal);

  res.json({
    periodo,
    productos: filas,
    conVentas: filas.filter((f) => !f.sinDatos).length,
    aviso:
      filas.every((f) => f.sinDatos)
        ? 'Todavía no hay ventas ligadas a una prenda en este período. Al anotar una venta, elegí la prenda para que el sistema pueda calcular su rentabilidad.'
        : null,
  });
});
