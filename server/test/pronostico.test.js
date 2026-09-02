// ============================================================
// PRUEBAS DEL PRONOSTICO
//
// Los numeros esperados estan calculados a mano. Importa
// especialmente el caso de "datos insuficientes": la regla del
// modulo es que cuando no se puede afirmar algo, se dice — nunca
// se devuelve un numero inventado, que es exactamente el problema
// que tenia la pantalla vieja.
// ============================================================

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  mediaMovil,
  tendencia,
  pronosticar,
  indiceEstacional,
  MINIMO_PERIODOS,
} from 'shared/pronostico';

// ── Media movil ──────────────────────────────────────────────

test('mediaMovil promedia los ultimos 3 periodos, no toda la serie', () => {
  // Los ultimos tres son 20, 30, 40 -> 30
  assert.equal(mediaMovil([5, 10, 20, 30, 40]), 30);
});

test('mediaMovil con menos datos que la ventana usa lo que hay', () => {
  assert.equal(mediaMovil([10, 20]), 15);
});

test('mediaMovil sin datos devuelve null en vez de cero', () => {
  // Cero significaria "vende cero"; null significa "no se sabe"
  assert.equal(mediaMovil([]), null);
});

// ── Tendencia ────────────────────────────────────────────────

test('tendencia con menos de 3 meses se declara no confiable', () => {
  const t = tendencia([10, 20]);
  assert.equal(t.confiable, false);
  assert.equal(t.proximo, null);
  assert.match(t.motivo, new RegExp(`al menos ${MINIMO_PERIODOS} meses`));
});

test('tendencia detecta una serie que sube de forma perfecta', () => {
  // 10, 20, 30, 40: pendiente 10, el proximo es 50, R2 = 1
  const t = tendencia([10, 20, 30, 40]);
  assert.equal(t.pendiente, 10);
  assert.equal(t.proximo, 50);
  assert.equal(t.r2, 1);
  assert.equal(t.direccion, 'sube');
  assert.equal(t.confiable, true);
});

test('tendencia detecta una serie que baja', () => {
  const t = tendencia([100, 80, 60, 40]);
  assert.equal(t.pendiente, -20);
  assert.equal(t.proximo, 20);
  assert.equal(t.direccion, 'baja');
});

test('una serie plana se reporta como estable, no como que sube', () => {
  const t = tendencia([50, 50, 50, 50]);
  assert.equal(t.pendiente, 0);
  assert.equal(t.direccion, 'estable');
});

test('CLAVE: una serie erratica se marca como NO confiable', () => {
  // Sube, baja, sube, baja: la recta no explica nada
  const t = tendencia([10, 90, 15, 85, 20]);
  assert.equal(t.confiable, false);
  assert.ok(t.r2 < 0.5, `R2 deberia ser bajo, fue ${t.r2}`);
  assert.match(t.motivo, /varían demasiado/);
});

test('el pronostico nunca proyecta ventas negativas', () => {
  // Cayendo asi, la recta daria negativo en el proximo periodo
  const t = tendencia([100, 60, 20]);
  assert.ok(t.proximo >= 0, `no puede ser negativo, fue ${t.proximo}`);
});

// ── Pronostico completo ──────────────────────────────────────

test('sin ventas registradas lo dice, no inventa un numero', () => {
  const p = pronosticar([], 'la polera');
  assert.equal(p.hayDatos, false);
  assert.equal(p.estimado, null);
  assert.match(p.mensaje, /Todavía no hay ventas/);
});

test('con 2 meses avisa que todavia no alcanza para tendencia', () => {
  const p = pronosticar([10, 20], 'la polera');
  assert.equal(p.suficiente, false);
  assert.equal(p.estimado, 15);
  assert.match(p.mensaje, /solo se puede estimar por promedio/);
});

test('con tendencia clara usa la recta y lo explica en criollo', () => {
  const p = pronosticar([10, 20, 30, 40], 'la chamarra');
  assert.equal(p.suficiente, true);
  assert.equal(p.estimado, 50);
  assert.match(p.mensaje, /vienen subiendo/);
  assert.match(p.mensaje, /50/);
});

test('con serie erratica cae al promedio y avisa por que', () => {
  const p = pronosticar([10, 90, 15, 85, 20], 'el polo');
  assert.equal(p.tendencia.confiable, false);
  // Promedio de los ultimos 3: (15 + 85 + 20) / 3 = 40
  assert.equal(p.estimado, 40);
  assert.match(p.mensaje, /Por eso se toma el promedio/);
});

// ── Estacionalidad ───────────────────────────────────────────

test('CLAVE: sin 12 meses no se afirma que haya temporadas', () => {
  const e = indiceEstacional({ '2026-01': 10, '2026-02': 20, '2026-03': 90 });
  assert.equal(e.hayEstacionalidad, false);
  assert.equal(e.indices, null);
  assert.match(e.motivo, /12 meses/);
});

test('con 12 meses identifica el mes fuerte y el flojo', () => {
  const meses = {};
  for (let m = 1; m <= 12; m++) {
    meses[`2026-${String(m).padStart(2, '0')}`] = 10;
  }
  meses['2026-06'] = 30; // invierno: se venden chamarras
  meses['2026-01'] = 5;

  const e = indiceEstacional(meses);
  assert.equal(e.hayEstacionalidad, true);
  assert.equal(e.mesFuerte[0], '2026-06');
  assert.equal(e.mesFlojo[0], '2026-01');
  assert.ok(e.indices['2026-06'] > 1, 'junio deberia estar por encima del promedio');
});
