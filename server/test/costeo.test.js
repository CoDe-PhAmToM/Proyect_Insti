// ============================================================
// PRUEBAS DEL MOTOR DE COSTEO
//
// Estas pruebas son la contraparte automatizada de la "hoja de
// validacion de resultados" que pide el objetivo especifico 3 del
// documento: comparar el calculo del sistema contra el calculo
// manual. Los numeros esperados de abajo estan hechos a mano.
// ============================================================

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  valorizarReceta,
  cifUnitario,
  costosFijosDelPeriodo,
  costearOrden,
  margenContribucion,
  puntoEquilibrio,
  margenBrutoPct,
  precioSugerido,
  resultadoPeriodo,
} from 'shared/costeo';

// ── Datos de referencia ──────────────────────────────────────
// Polera Clasica Urbana, calculada a mano:
//   1.4 m de algodon a 28.50  = 39.90
//   0.05 conos de hilo a 12.00 = 0.60
//   1 etiqueta a 0.85          = 0.85
//   ---------------------------------
//   materiales                 = 41.35

const MATERIALES = [
  { id: 'm1', nombre: 'Algodon peinado 30/1', unidad: 'metro', precioUnitario: 28.5 },
  { id: 'm2', nombre: 'Hilo poliester Coats', unidad: 'cono', precioUnitario: 12.0 },
  { id: 'm3', nombre: 'Etiqueta tejida marca', unidad: 'unidad', precioUnitario: 0.85 },
];

const RECETA_POLERA = [
  { materialId: 'm1', cantidad: 1.4 },
  { materialId: 'm2', cantidad: 0.05 },
  { materialId: 'm3', cantidad: 1 },
];

test('valorizarReceta suma los materiales al precio vigente', () => {
  const r = valorizarReceta(RECETA_POLERA, MATERIALES);
  assert.equal(r.subtotal, 41.35);
  assert.equal(r.hayFaltantes, false);
  assert.equal(r.lineas[0].subtotal, 39.9);
});

test('valorizarReceta no rompe si borraron un material del inventario', () => {
  const r = valorizarReceta(RECETA_POLERA, [MATERIALES[0], MATERIALES[2]]);
  assert.equal(r.hayFaltantes, true);
  // El hilo faltante aporta 0, el resto se sigue calculando
  assert.equal(r.subtotal, 40.75);
  assert.equal(r.lineas[1].faltante, true);
});

test('valorizarReceta refleja un cambio de precio del inventario', () => {
  const masCaro = MATERIALES.map((m) => (m.id === 'm1' ? { ...m, precioUnitario: 32 } : m));
  const r = valorizarReceta(RECETA_POLERA, masCaro);
  // 1.4 * 32 = 44.80  +  0.60  +  0.85  =  46.25
  assert.equal(r.subtotal, 46.25);
});

// ── Costos indirectos ────────────────────────────────────────

test('cifUnitario prorratea los costos fijos entre las unidades del mes', () => {
  // 1600 Bs de alquiler y luz repartidos entre 500 prendas = 3.20
  assert.equal(cifUnitario(1600, 500), 3.2);
});

test('cifUnitario devuelve 0 si todavia no se produjo nada (no divide por cero)', () => {
  assert.equal(cifUnitario(1600, 0), 0);
});

test('costosFijosDelPeriodo solo suma los vigentes en ese mes', () => {
  const fijos = [
    { concepto: 'alquiler', montoMensual: 1200, vigenteDesde: '2026-01-01', vigenteHasta: null },
    { concepto: 'luz', montoMensual: 400, vigenteDesde: '2026-01-01', vigenteHasta: null },
    { concepto: 'internet viejo', montoMensual: 150, vigenteDesde: '2025-01-01', vigenteHasta: '2025-12-31' },
  ];
  assert.equal(costosFijosDelPeriodo(fijos, '2026-06'), 1600);
});

// ── Costeo por orden ─────────────────────────────────────────

test('costearOrden divide el costo acumulado entre lo realmente producido', () => {
  // Orden de 25 poleras:
  //   materiales 1033.75 + mano de obra 212.50 + CIF 80.00 = 1326.25
  //   costo unitario = 1326.25 / 25 = 53.05
  const c = costearOrden({
    costoMateriales: 1033.75,
    costoManoObra: 212.5,
    costoCif: 80,
    cantidadProducida: 25,
  });

  assert.equal(c.costoTotal, 1326.25);
  assert.equal(c.costoUnitario, 53.05);
  // El costo variable excluye el CIF: 1246.25 / 25 = 49.85
  assert.equal(c.costoVariableUnitario, 49.85);
});

test('costearOrden no divide por cero si la orden aun no produjo unidades', () => {
  const c = costearOrden({ costoMateriales: 500, cantidadProducida: 0 });
  assert.equal(c.costoUnitario, 0);
  assert.equal(c.costoTotal, 500);
});

// ── Margen y punto de equilibrio ─────────────────────────────

test('margenContribucion es precio menos costo variable unitario', () => {
  assert.equal(margenContribucion(65, 49.85), 15.15);
});

test('puntoEquilibrio redondea hacia arriba: no se venden prendas partidas', () => {
  // 1600 de costos fijos / 15.15 de margen = 105.6 -> 106 poleras
  const pe = puntoEquilibrio(1600, 65, 49.85);
  assert.equal(pe.alcanzable, true);
  assert.equal(pe.unidades, 106);
  assert.equal(pe.montoBs, 6890);
});

test('puntoEquilibrio avisa cuando se pierde plata en cada prenda', () => {
  // Vende a 45 lo que le cuesta 49.85 de variable: ningun volumen salva eso
  const pe = puntoEquilibrio(1600, 45, 49.85);
  assert.equal(pe.alcanzable, false);
  assert.equal(pe.unidades, null);
  assert.match(pe.motivo, /por debajo del costo variable/);
});

test('puntoEquilibrio avisa cuando el precio apenas cubre el costo variable', () => {
  const pe = puntoEquilibrio(1600, 49.85, 49.85);
  assert.equal(pe.alcanzable, false);
  assert.match(pe.motivo, /no deja nada/);
});

test('margenBrutoPct y precioSugerido son inversos entre si', () => {
  const costo = 53.05;
  const precio = precioSugerido(costo, 40);
  assert.equal(precio, 74.27);
  // Margen sobre el precio de venta, no sobre el costo: son distintos
  assert.equal(margenBrutoPct(precio, costo), 28.57);
});

// ── Resultado del periodo ────────────────────────────────────

test('resultadoPeriodo aplica ingresos - egresos - retiros', () => {
  const registros = [
    { tipo: 'INGRESO', monto: 1810, origen: 'NEGOCIO' },
    { tipo: 'EGRESO', monto: 505, origen: 'NEGOCIO' },
    { tipo: 'RETIRO', monto: 125, origen: 'PERSONAL' },
  ];
  const r = resultadoPeriodo(registros);

  assert.equal(r.ingresos, 1810);
  assert.equal(r.egresos, 505);
  assert.equal(r.retiros, 125);
  assert.equal(r.gananciaReal, 1180);
});

test('resultadoPeriodo separa la mezcla personal: el numero del objetivo 4', () => {
  const registros = [
    { tipo: 'INGRESO', monto: 1000, origen: 'NEGOCIO' },
    { tipo: 'EGRESO', monto: 300, origen: 'NEGOCIO' },
    { tipo: 'EGRESO', monto: 85, origen: 'PERSONAL' }, // mercado familiar
    { tipo: 'RETIRO', monto: 40, origen: 'PERSONAL' }, // transporte del hijo
  ];
  const r = resultadoPeriodo(registros);

  assert.equal(r.gananciaReal, 575); // 1000 - 385 - 40
  assert.equal(r.mezclaPersonal, 125); // 85 + 40
  // Lo que ganaria si no mezclara: esta diferencia es la que hay que mostrarle
  assert.equal(r.gananciaSinMezcla, 700);
});

test('relacionCostoIngreso es null si todavia no hubo ingresos', () => {
  const r = resultadoPeriodo([{ tipo: 'EGRESO', monto: 300, origen: 'NEGOCIO' }]);
  assert.equal(r.relacionCostoIngreso, null);
});
