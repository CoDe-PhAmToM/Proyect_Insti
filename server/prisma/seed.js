// ============================================================
// DATOS SEMILLA
//
// Deja la base usable para desarrollo y para la demostracion:
// categorias globales precargadas (las "plantillas digitales" que
// pide el objetivo 2), un taller de ejemplo con datos realistas del
// Distrito 6, y un usuario por cada rol del sistema.
//
// Es idempotente: se puede correr varias veces sin duplicar nada.
// ============================================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Clave de los usuarios de prueba. En produccion se cambia por
// variable de entorno; nunca dejar esta en un despliegue real.
const CLAVE_DEMO = process.env.SEED_PASSWORD ?? 'gestione2026';

// ── Categorias globales ──────────────────────────────────────
// Sin tallerId: las ve todo el mundo. Estan redactadas como las
// diria un confeccionista, no como un plan de cuentas contable.
const CATEGORIAS = [
  { nombre: 'Venta de prendas', tipo: 'INGRESO', esPersonal: false, orden: 1 },
  { nombre: 'Venta por pedido', tipo: 'INGRESO', esPersonal: false, orden: 2 },
  { nombre: 'Otro ingreso', tipo: 'INGRESO', esPersonal: false, orden: 3 },

  { nombre: 'Tela, hilos y avios', tipo: 'EGRESO', esPersonal: false, orden: 1 },
  { nombre: 'Pago a ayudantes', tipo: 'EGRESO', esPersonal: false, orden: 2 },
  { nombre: 'Luz, agua e internet', tipo: 'EGRESO', esPersonal: false, orden: 3 },
  { nombre: 'Alquiler del taller', tipo: 'EGRESO', esPersonal: false, orden: 4 },
  { nombre: 'Transporte y envios', tipo: 'EGRESO', esPersonal: false, orden: 5 },
  { nombre: 'Maquinas y herramientas', tipo: 'EGRESO', esPersonal: false, orden: 6 },
  { nombre: 'Otro gasto del taller', tipo: 'EGRESO', esPersonal: false, orden: 7 },

  { nombre: 'Gasto de la casa', tipo: 'RETIRO', esPersonal: true, orden: 1 },
  { nombre: 'Colegio y transporte de los hijos', tipo: 'RETIRO', esPersonal: true, orden: 2 },
  { nombre: 'Salud y emergencias', tipo: 'RETIRO', esPersonal: true, orden: 3 },
  { nombre: 'Otro retiro personal', tipo: 'RETIRO', esPersonal: true, orden: 4 },
];

const MATERIALES = [
  { codigo: 'TLA-001', nombre: 'Algodon peinado 30/1', categoria: 'Tela',   unidad: 'metro',  precioUnitario: 28.5, stock: 145,  stockMinimo: 50 },
  { codigo: 'TLA-002', nombre: 'Polialgodon Pique',    categoria: 'Tela',   unidad: 'metro',  precioUnitario: 22.0, stock: 38,   stockMinimo: 50 },
  { codigo: 'TLA-003', nombre: 'Polar antipilling',    categoria: 'Tela',   unidad: 'metro',  precioUnitario: 35.0, stock: 62,   stockMinimo: 30 },
  { codigo: 'HIL-001', nombre: 'Hilo poliester Coats', categoria: 'Hilo',   unidad: 'cono',   precioUnitario: 12.0, stock: 87,   stockMinimo: 30 },
  { codigo: 'HIL-002', nombre: 'Hilo elastico blanco', categoria: 'Hilo',   unidad: 'rollo',  precioUnitario: 8.5,  stock: 14,   stockMinimo: 20 },
  { codigo: 'ETQ-001', nombre: 'Etiqueta tejida marca',categoria: 'Insumo', unidad: 'unidad', precioUnitario: 0.85, stock: 1240, stockMinimo: 500 },
  { codigo: 'BTN-003', nombre: 'Boton metal 18mm',     categoria: 'Insumo', unidad: 'unidad', precioUnitario: 1.2,  stock: 22,   stockMinimo: 100 },
  { codigo: 'CRR-001', nombre: 'Cierre YKK 60cm',      categoria: 'Insumo', unidad: 'unidad', precioUnitario: 8.5,  stock: 67,   stockMinimo: 40 },
];

const PRODUCTOS = [
  {
    sku: 'POL-CLA-001', nombre: 'Polera Clasica Urbana', categoria: 'Poleras', emoji: '👕',
    descripcion: 'Algodon peinado, varios colores', precioVenta: 65, manoObraUnitaria: 8.5,
    publicadoEnTienda: true,
    receta: [['TLA-001', 1.4], ['HIL-001', 0.05], ['ETQ-001', 1]],
  },
  {
    sku: 'CHA-AND-001', nombre: 'Chamarra Modelo Andes', categoria: 'Chamarras', emoji: '🧥',
    descripcion: 'Cierre YKK, ideal para el frio alteno', precioVenta: 220, manoObraUnitaria: 22,
    publicadoEnTienda: true,
    receta: [['TLA-003', 2.2], ['CRR-001', 1], ['HIL-001', 0.15], ['ETQ-001', 1]],
  },
  {
    sku: 'POL-DEP-001', nombre: 'Polo Deportivo', categoria: 'Deportivo', emoji: '👕',
    descripcion: 'Polialgodon pique, transpirable', precioVenta: 75, manoObraUnitaria: 7,
    publicadoEnTienda: true,
    receta: [['TLA-002', 1.2], ['HIL-002', 0.03], ['ETQ-001', 1]],
  },
];

const COSTOS_FIJOS = [
  { concepto: 'Alquiler del taller', montoMensual: 800 },
  { concepto: 'Luz', montoMensual: 250 },
  { concepto: 'Agua', montoMensual: 80 },
];

// Refleja la realidad que describe la tesis: gastos personales
// saliendo de la caja del negocio.
const REGISTROS = [
  { fecha: '2026-06-02', tipo: 'INGRESO', cat: 'Venta de prendas',              desc: 'Venta 3 poleras negras talla M',      monto: 195, origen: 'NEGOCIO',  sku: 'POL-CLA-001', cantidad: 3, precio: 65 },
  { fecha: '2026-06-02', tipo: 'EGRESO',  cat: 'Tela, hilos y avios',           desc: 'Compra 5m tela algodon peinado',      monto: 142, origen: 'NEGOCIO' },
  { fecha: '2026-06-02', tipo: 'RETIRO',  cat: 'Gasto de la casa',              desc: 'Mercado familiar',                    monto: 85,  origen: 'PERSONAL' },
  { fecha: '2026-06-01', tipo: 'INGRESO', cat: 'Venta por pedido',              desc: 'Pedido corporativo 10 polos',         monto: 750, origen: 'NEGOCIO',  sku: 'POL-DEP-001', cantidad: 10, precio: 75 },
  { fecha: '2026-06-01', tipo: 'EGRESO',  cat: 'Luz, agua e internet',          desc: 'Factura luz del taller - mayo',       monto: 68,  origen: 'NEGOCIO' },
  { fecha: '2026-06-01', tipo: 'RETIRO',  cat: 'Colegio y transporte de los hijos', desc: 'Transporte escolar del hijo',     monto: 40,  origen: 'PERSONAL' },
  { fecha: '2026-05-31', tipo: 'INGRESO', cat: 'Venta de prendas',              desc: 'Venta 2 chamarras modelo andes',      monto: 440, origen: 'NEGOCIO',  sku: 'CHA-AND-001', cantidad: 2, precio: 220 },
  { fecha: '2026-05-31', tipo: 'EGRESO',  cat: 'Pago a ayudantes',              desc: 'Pago ayudante costura - semana',      monto: 200, origen: 'NEGOCIO' },
  { fecha: '2026-05-30', tipo: 'EGRESO',  cat: 'Tela, hilos y avios',           desc: 'Hilos, botones y cierres varios',     monto: 95,  origen: 'NEGOCIO' },
  { fecha: '2026-05-30', tipo: 'INGRESO', cat: 'Venta de prendas',              desc: 'Venta 5 poleras manga larga',         monto: 425, origen: 'NEGOCIO',  sku: 'POL-CLA-001', cantidad: 5, precio: 85 },
];

const fecha = (s) => new Date(`${s}T00:00:00Z`);

async function main() {
  console.log('Sembrando datos...\n');

  // ── Categorias globales ────────────────────────────────────
  for (const c of CATEGORIAS) {
    const existente = await prisma.categoria.findFirst({
      where: { tallerId: null, nombre: c.nombre },
    });
    if (!existente) await prisma.categoria.create({ data: c });
  }
  console.log(`  ${CATEGORIAS.length} categorias globales`);

  // ── Usuarios ───────────────────────────────────────────────
  const hash = await bcrypt.hash(CLAVE_DEMO, 12);
  const usuario = (email, nombre, rol) =>
    prisma.usuario.upsert({
      where: { email },
      update: {},
      create: { email, nombre, rol, passwordHash: hash, activo: true },
    });

  const admin = await usuario('admin@gestione.bo', 'Equipo investigador', 'ADMIN');
  const maria = await usuario('maria@taller.bo', 'Maria Mamani', 'PRODUCTOR');
  const ayudante = await usuario('ayudante@taller.bo', 'Rosa Quispe', 'AYUDANTE');
  const cliente = await usuario('juan@cliente.bo', 'Juan Quispe', 'CLIENTE');
  console.log('  4 usuarios (uno por rol)');

  // ── Taller ─────────────────────────────────────────────────
  let taller = await prisma.taller.findFirst({ where: { propietarioId: maria.id } });
  if (!taller) {
    taller = await prisma.taller.create({
      data: {
        nombre: 'Taller Mamani',
        propietarioId: maria.id,
        distrito: 'Distrito 6 - El Alto',
        telefono: '70000000',
        enPiloto: true,
      },
    });
  }

  for (const [u, rol] of [[maria, 'PRODUCTOR'], [ayudante, 'AYUDANTE']]) {
    await prisma.usuarioTaller.upsert({
      where: { usuarioId_tallerId: { usuarioId: u.id, tallerId: taller.id } },
      update: {},
      create: { usuarioId: u.id, tallerId: taller.id, rolEnTaller: rol },
    });
  }
  console.log(`  Taller "${taller.nombre}" con 2 miembros`);

  // ── Materiales, con su movimiento de entrada inicial ────────
  const matPorCodigo = {};
  for (const m of MATERIALES) {
    const mat = await prisma.material.upsert({
      where: { tallerId_codigo: { tallerId: taller.id, codigo: m.codigo } },
      update: {},
      create: { ...m, tallerId: taller.id },
    });
    matPorCodigo[m.codigo] = mat;

    // El stock inicial entra como movimiento: el kardex arranca cuadrado
    const yaTiene = await prisma.movimientoMaterial.findFirst({ where: { materialId: mat.id } });
    if (!yaTiene) {
      await prisma.movimientoMaterial.create({
        data: {
          materialId: mat.id,
          tipo: 'ENTRADA',
          cantidad: m.stock,
          costoUnitario: m.precioUnitario,
          saldoCantidad: m.stock,
          saldoValor: Number((m.stock * m.precioUnitario).toFixed(2)),
          motivo: 'Inventario inicial',
          fecha: fecha('2026-05-30'),
        },
      });
    }
  }
  console.log(`  ${MATERIALES.length} materiales con kardex inicial`);

  // ── Productos con receta ───────────────────────────────────
  const prodPorSku = {};
  for (const { receta, ...p } of PRODUCTOS) {
    const prod = await prisma.producto.upsert({
      where: { tallerId_sku: { tallerId: taller.id, sku: p.sku } },
      update: {},
      create: { ...p, tallerId: taller.id },
    });
    prodPorSku[p.sku] = prod;

    for (const [codigo, cantidad] of receta) {
      const mat = matPorCodigo[codigo];
      await prisma.productoMaterial.upsert({
        where: { productoId_materialId: { productoId: prod.id, materialId: mat.id } },
        update: { cantidad },
        create: { productoId: prod.id, materialId: mat.id, cantidad },
      });
    }
  }
  console.log(`  ${PRODUCTOS.length} productos con su receta`);

  // ── Costos fijos: habilitan el punto de equilibrio ─────────
  for (const cf of COSTOS_FIJOS) {
    const existe = await prisma.costoFijo.findFirst({
      where: { tallerId: taller.id, concepto: cf.concepto },
    });
    if (!existe) {
      await prisma.costoFijo.create({
        data: { ...cf, tallerId: taller.id, vigenteDesde: fecha('2026-01-01') },
      });
    }
  }
  const totalFijo = COSTOS_FIJOS.reduce((a, c) => a + c.montoMensual, 0);
  console.log(`  ${COSTOS_FIJOS.length} costos fijos (Bs. ${totalFijo}/mes)`);

  // ── Movimientos financieros ────────────────────────────────
  const cats = await prisma.categoria.findMany({ where: { tallerId: null } });
  const catPorNombre = Object.fromEntries(cats.map((c) => [c.nombre, c]));

  let creados = 0;
  for (const r of REGISTROS) {
    const existe = await prisma.registro.findFirst({
      where: { tallerId: taller.id, descripcion: r.desc, monto: r.monto },
    });
    if (existe) continue;

    await prisma.registro.create({
      data: {
        tallerId: taller.id,
        fecha: fecha(r.fecha),
        tipo: r.tipo,
        categoriaId: catPorNombre[r.cat].id,
        descripcion: r.desc,
        monto: r.monto,
        origen: r.origen,
        productoId: r.sku ? prodPorSku[r.sku].id : null,
        cantidad: r.cantidad ?? null,
        precioUnitario: r.precio ?? null,
        creadoPorId: maria.id,
      },
    });
    creados++;
  }
  console.log(`  ${creados} movimientos financieros`);

  // ── Resumen ────────────────────────────────────────────────
  const ing = REGISTROS.filter((r) => r.tipo === 'INGRESO').reduce((a, r) => a + r.monto, 0);
  const egr = REGISTROS.filter((r) => r.tipo === 'EGRESO').reduce((a, r) => a + r.monto, 0);
  const ret = REGISTROS.filter((r) => r.tipo === 'RETIRO').reduce((a, r) => a + r.monto, 0);

  console.log(`
Listo.

  Ingresos   Bs. ${ing}
  Egresos    Bs. ${egr}
  Retiros    Bs. ${ret}
  ---------------------------
  Ganancia   Bs. ${ing - egr - ret}   (mezcla personal: Bs. ${ret})

Usuarios de prueba, todos con la clave "${CLAVE_DEMO}":
  admin@gestione.bo      equipo investigador
  maria@taller.bo        productora, duena del taller
  ayudante@taller.bo     ayudante, no ve margenes
  juan@cliente.bo        cliente de la tienda
`);
}

main()
  .catch((e) => {
    console.error('Fallo la siembra:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
