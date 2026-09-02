// ============================================================
// PRUEBA DE AISLAMIENTO ENTRE TALLERES
//
// La garantia mas importante del sistema: en el piloto conviven
// datos financieros reales de varios microempresarios y ninguno
// puede ver los del otro, ni siquiera manipulando la peticion.
//
// Segun el plan, esta prueba se corre en CADA sprint.
// Crea sus propios datos y los borra al terminar.
// ============================================================

import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';

import { prisma } from '../src/lib/prisma.js';
import { conTaller, scope, exigirTaller, bloquearAyudante } from '../src/middleware/tenancy.js';

const marca = `test-${Date.now()}`;
const ids = { usuarios: [], talleres: [] };

// Ejecuta el middleware y devuelve el error si lo hubo.
const correr = async (middleware, req) => {
  let error = null;
  let siguio = false;
  await middleware(req, {}, (e) => {
    if (e) error = e;
    else siguio = true;
  }).catch?.((e) => {
    error = e;
  });
  return { error, siguio, req };
};

// Los middlewares async lanzan en vez de llamar next(err).
const capturar = async (fn) => {
  try {
    await fn();
    return null;
  } catch (e) {
    return e;
  }
};

let tallerA;
let tallerB;
let mariaA;
let rosaB;
let ayudanteA;
let clienteX;
let admin;

before(async () => {
  const crearUsuario = (sufijo, rol) =>
    prisma.usuario.create({
      data: {
        email: `${marca}-${sufijo}@test.bo`,
        passwordHash: 'x',
        nombre: `Prueba ${sufijo}`,
        rol,
      },
    });

  mariaA = await crearUsuario('maria', 'PRODUCTOR');
  rosaB = await crearUsuario('rosa', 'PRODUCTOR');
  ayudanteA = await crearUsuario('ayudante', 'AYUDANTE');
  clienteX = await crearUsuario('cliente', 'CLIENTE');
  admin = await crearUsuario('admin', 'ADMIN');
  ids.usuarios.push(mariaA.id, rosaB.id, ayudanteA.id, clienteX.id, admin.id);

  tallerA = await prisma.taller.create({
    data: { nombre: `${marca} Taller A`, propietarioId: mariaA.id },
  });
  tallerB = await prisma.taller.create({
    data: { nombre: `${marca} Taller B`, propietarioId: rosaB.id },
  });
  ids.talleres.push(tallerA.id, tallerB.id);

  await prisma.usuarioTaller.createMany({
    data: [
      { usuarioId: mariaA.id, tallerId: tallerA.id, rolEnTaller: 'PRODUCTOR' },
      { usuarioId: ayudanteA.id, tallerId: tallerA.id, rolEnTaller: 'AYUDANTE' },
      { usuarioId: rosaB.id, tallerId: tallerB.id, rolEnTaller: 'PRODUCTOR' },
    ],
  });
});

after(async () => {
  await prisma.usuarioTaller.deleteMany({ where: { tallerId: { in: ids.talleres } } });
  await prisma.taller.deleteMany({ where: { id: { in: ids.talleres } } });
  await prisma.usuario.deleteMany({ where: { id: { in: ids.usuarios } } });
  await prisma.$disconnect();
});

const req = (usuario, extra = {}) => ({
  usuario,
  query: {},
  params: {},
  ...extra,
});

// ── Lo esperable ─────────────────────────────────────────────

test('el productor cae en su propio taller sin pedirlo', async () => {
  const r = req({ usuarioId: mariaA.id, rol: 'PRODUCTOR' });
  await conTaller(r, {}, () => {});
  assert.equal(r.tallerId, tallerA.id);
  assert.equal(r.rolEnTaller, 'PRODUCTOR');
});

test('el productor puede pedir explicitamente SU taller', async () => {
  const r = req({ usuarioId: rosaB.id, rol: 'PRODUCTOR' }, { query: { tallerId: tallerB.id } });
  await conTaller(r, {}, () => {});
  assert.equal(r.tallerId, tallerB.id);
});

// ── El candado ───────────────────────────────────────────────

test('CLAVE: Maria no puede entrar al taller de Rosa aunque mande el id', async () => {
  const r = req({ usuarioId: mariaA.id, rol: 'PRODUCTOR' }, { query: { tallerId: tallerB.id } });
  const err = await capturar(() => conTaller(r, {}, () => {}));

  assert.ok(err, 'deberia haber lanzado');
  assert.equal(err.estado, 403);
  assert.equal(r.tallerId, undefined, 'no debe quedar ningun taller resuelto');
});

test('CLAVE: tampoco entra pasando el id por la ruta en vez de la query', async () => {
  const r = req({ usuarioId: mariaA.id, rol: 'PRODUCTOR' }, { params: { tallerId: tallerB.id } });
  const err = await capturar(() => conTaller(r, {}, () => {}));
  assert.equal(err.estado, 403);
});

test('un taller inexistente da el mismo error que uno ajeno (no revela que ids existen)', async () => {
  const inexistente = '00000000-0000-4000-8000-000000000000';
  const r1 = req({ usuarioId: mariaA.id, rol: 'PRODUCTOR' }, { query: { tallerId: tallerB.id } });
  const r2 = req({ usuarioId: mariaA.id, rol: 'PRODUCTOR' }, { query: { tallerId: inexistente } });

  const e1 = await capturar(() => conTaller(r1, {}, () => {}));
  const e2 = await capturar(() => conTaller(r2, {}, () => {}));

  assert.equal(e1.message, e2.message);
  assert.equal(e1.estado, e2.estado);
});

test('un usuario sin taller asignado recibe una explicacion util', async () => {
  const huerfano = await prisma.usuario.create({
    data: { email: `${marca}-huerfano@test.bo`, passwordHash: 'x', nombre: 'Huerfano', rol: 'PRODUCTOR' },
  });
  ids.usuarios.push(huerfano.id);

  const err = await capturar(() =>
    conTaller(req({ usuarioId: huerfano.id, rol: 'PRODUCTOR' }), {}, () => {})
  );
  assert.equal(err.estado, 403);
  assert.match(err.message, /no esta asignado a ningun taller/);
});

test('el cliente de la tienda no entra a la seccion de talleres', async () => {
  const err = await capturar(() =>
    conTaller(req({ usuarioId: clienteX.id, rol: 'CLIENTE' }), {}, () => {})
  );
  assert.equal(err.estado, 403);
});

// ── Admin ────────────────────────────────────────────────────

test('el admin puede mirar un taller concreto para exportar el piloto', async () => {
  const r = req({ usuarioId: admin.id, rol: 'ADMIN' }, { query: { tallerId: tallerB.id } });
  await conTaller(r, {}, () => {});
  assert.equal(r.tallerId, tallerB.id);
  assert.equal(r.esAdmin, true);
});

test('el admin sin taller indicado queda en vista agregada', async () => {
  const r = req({ usuarioId: admin.id, rol: 'ADMIN' });
  await conTaller(r, {}, () => {});
  assert.equal(r.tallerId, null);
});

// ── Red de seguridad ─────────────────────────────────────────

test('scope() se niega a construir un filtro sin taller', () => {
  assert.throws(() => scope({ tallerId: null }), /necesita un taller definido/);
  assert.deepEqual(scope({ tallerId: tallerA.id }), { tallerId: tallerA.id });
});

test('exigirTaller corta la vista agregada donde no corresponde', () => {
  const err = capturarSync(() => exigirTaller({ tallerId: null }, {}, () => {}));
  assert.equal(err.estado, 400);
});

test('el ayudante no accede a costos ni margenes', () => {
  const err = capturarSync(() =>
    bloquearAyudante({ usuario: { rol: 'AYUDANTE' }, rolEnTaller: 'AYUDANTE' }, {}, () => {})
  );
  assert.equal(err.estado, 403);

  let paso = false;
  bloquearAyudante({ usuario: { rol: 'PRODUCTOR' }, rolEnTaller: 'PRODUCTOR' }, {}, () => {
    paso = true;
  });
  assert.equal(paso, true);
});

function capturarSync(fn) {
  try {
    fn();
    return null;
  } catch (e) {
    return e;
  }
}
