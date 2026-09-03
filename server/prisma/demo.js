// ============================================================
// DATOS DE DEMOSTRACION PARA LA DEFENSA
//
// Se corre con:  npm run db:demo
//
// Por que existe: con los datos semilla el sistema tiene 12
// movimientos. Ante un tribunal eso se ve como un sistema vacio —
// el grafico plano, el pronostico que no se emite por falta de
// datos, el comparativo sin evolucion. Todo funcionando, pero sin
// nada que mostrar.
//
// Este script genera 6 meses de historia realista de un taller del
// Distrito 6. Con eso: el grafico toma forma, el pronostico SI se
// emite, el comparativo muestra evolucion y las recomendaciones
// aparecen con casos concretos.
//
// Los datos son verosimiles a proposito, no optimistas:
//  - Estacionalidad real: las chamarras suben en junio y julio,
//    que es el invierno alteno. No es un invento — es el patron que
//    el propio documento menciona.
//  - Meses malos: hay uno con perdida. Un taller que gana siempre
//    no le pasa a nadie y se nota.
//  - Mezcla de finanzas: retiros para la casa todos los meses, que
//    es exactamente el problema que la tesis viene a mostrar.
//  - Mermas: no todas las ordenes salen completas.
//
// IMPORTANTE: es data de DEMOSTRACION, no del piloto. Los talleres
// reales se crean vacios y cargan lo suyo.
// ============================================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const CLAVE = process.env.SEED_PASSWORD ?? 'gestione2026';
const HOY = new Date();

// Los ultimos 6 meses cerrados, del mas viejo al mas nuevo
const MESES = Array.from({ length: 6 }, (_, i) => {
  const d = new Date(Date.UTC(HOY.getUTCFullYear(), HOY.getUTCMonth() - (5 - i), 1));
  return { anio: d.getUTCFullYear(), mes: d.getUTCMonth() + 1, fecha: d };
});

const azar = (min, max) => min + Math.random() * (max - min);
const entero = (min, max) => Math.floor(azar(min, max + 1));
const red = (n) => Math.round(n * 100) / 100;

const diaDe = ({ anio, mes }, dia) => new Date(Date.UTC(anio, mes - 1, Math.min(dia, 28)));

/**
 * Factor estacional por mes. En Bolivia, junio y julio son el
 * invierno alteno: las chamarras y los buzos se disparan.
 */
const factorAbrigo = (mes) => ({ 5: 1.4, 6: 2.6, 7: 2.4, 8: 1.5 })[mes] ?? 0.7;
const factorLivianas = (mes) => ({ 6: 0.5, 7: 0.5, 11: 1.3, 12: 1.4, 1: 1.3 })[mes] ?? 1;

async function main() {
  console.log('\nGenerando 6 meses de historia para la demostración...\n');

  const taller = await prisma.taller.findFirst({
    where: { nombre: 'Taller Mamani' },
    include: { propietario: true },
  });
  if (!taller) {
    console.error('No se encontró el Taller Mamani. Corré primero: npm run db:seed');
    process.exit(1);
  }

  const [productos, categorias, usuario] = await Promise.all([
    prisma.producto.findMany({ where: { tallerId: taller.id }, include: { receta: true } }),
    prisma.categoria.findMany({ where: { tallerId: null } }),
    prisma.usuario.findUnique({ where: { id: taller.propietarioId } }),
  ]);

  const cat = (nombre) => categorias.find((c) => c.nombre === nombre);
  const prod = (frag) => productos.find((p) => p.nombre.toLowerCase().includes(frag));

  const polera = prod('polera');
  const chamarra = prod('chamarra');
  const polo = prod('polo');

  if (!polera || !chamarra || !polo) {
    console.error('Faltan productos base. Corré primero: npm run db:seed');
    process.exit(1);
  }

  // ── Limpiar la demo anterior ────────────────────────────────
  // Se borra solo lo generado por este script, reconocible porque
  // la descripcion termina en el marcador.
  const MARCA = '[demo]';
  const borrados = await prisma.registro.deleteMany({
    where: { tallerId: taller.id, descripcion: { endsWith: MARCA } },
  });
  if (borrados.count > 0) console.log(`  Se limpiaron ${borrados.count} movimientos de una demo anterior`);

  const registros = [];
  const anotar = (fecha, tipo, categoria, descripcion, monto, extra = {}) => {
    registros.push({
      tallerId: taller.id,
      fecha,
      tipo,
      categoriaId: cat(categoria).id,
      descripcion: `${descripcion} ${MARCA}`,
      monto: red(monto),
      origen: tipo === 'RETIRO' ? 'PERSONAL' : 'NEGOCIO',
      creadoPorId: usuario.id,
      ...extra,
    });
  };

  // ── Movimientos mes a mes ───────────────────────────────────
  for (const m of MESES) {
    const abrigo = factorAbrigo(m.mes);
    const liviana = factorLivianas(m.mes);

    // Ventas de poleras: varias por mes, chicas
    const ventasPolera = entero(4, 8);
    for (let i = 0; i < ventasPolera; i++) {
      const cant = entero(2, 6);
      anotar(
        diaDe(m, entero(2, 27)),
        'INGRESO',
        'Venta de prendas',
        `Venta ${cant} poleras`,
        cant * 65 * azar(0.95, 1.05),
        { productoId: polera.id, cantidad: cant, precioUnitario: 65 }
      );
    }

    // Chamarras: pocas pero grandes, y muy estacionales
    const ventasChamarra = Math.max(0, Math.round(entero(1, 3) * abrigo));
    for (let i = 0; i < ventasChamarra; i++) {
      const cant = entero(1, 3);
      anotar(
        diaDe(m, entero(3, 26)),
        'INGRESO',
        'Venta de prendas',
        `Venta ${cant} chamarra${cant > 1 ? 's' : ''} modelo Andes`,
        cant * 220,
        { productoId: chamarra.id, cantidad: cant, precioUnitario: 220 }
      );
    }

    // Polos: al revés, bajan en invierno
    const ventasPolo = Math.max(1, Math.round(entero(2, 5) * liviana));
    for (let i = 0; i < ventasPolo; i++) {
      const cant = entero(3, 10);
      anotar(
        diaDe(m, entero(2, 27)),
        'INGRESO',
        'Venta por pedido',
        `Pedido ${cant} polos deportivos`,
        cant * 75,
        { productoId: polo.id, cantidad: cant, precioUnitario: 75 }
      );
    }

    // ── Egresos ──
    for (let i = 0; i < entero(2, 4); i++) {
      anotar(diaDe(m, entero(1, 25)), 'EGRESO', 'Tela, hilos y avios',
        ['Compra de tela algodón', 'Hilos y avíos', 'Rollo de polar', 'Cierres y botones'][entero(0, 3)],
        azar(120, 420));
    }
    anotar(diaDe(m, 5), 'EGRESO', 'Luz, agua e internet', 'Factura de luz del taller', azar(55, 95));
    anotar(diaDe(m, 5), 'EGRESO', 'Alquiler del taller', 'Alquiler del mes', 800);
    for (let i = 0; i < entero(2, 4); i++) {
      anotar(diaDe(m, entero(6, 27)), 'EGRESO', 'Pago a ayudantes', 'Pago semanal a la ayudante', azar(180, 260));
    }
    if (Math.random() > 0.6) {
      anotar(diaDe(m, entero(8, 24)), 'EGRESO', 'Transporte y envios', 'Movilidad para entregar pedido', azar(20, 60));
    }

    // ── Retiros para la casa: el problema que la tesis muestra ──
    anotar(diaDe(m, entero(3, 10)), 'RETIRO', 'Gasto de la casa', 'Mercado de la semana', azar(180, 320));
    anotar(diaDe(m, entero(12, 20)), 'RETIRO', 'Colegio y transporte de los hijos', 'Transporte escolar', azar(60, 120));
    if (Math.random() > 0.65) {
      anotar(diaDe(m, entero(15, 26)), 'RETIRO', 'Salud y emergencias', 'Farmacia', azar(50, 180));
    }
  }

  await prisma.registro.createMany({ data: registros });
  console.log(`  ${registros.length} movimientos en ${MESES.length} meses`);

  // ── Ordenes de produccion, una por mes ──────────────────────
  const ordenesBorradas = await prisma.ordenProduccion.deleteMany({
    where: { tallerId: taller.id, notas: { endsWith: MARCA } },
  });
  if (ordenesBorradas.count > 0) console.log(`  Se limpiaron ${ordenesBorradas.count} órdenes anteriores`);

  const ultimo = await prisma.ordenProduccion.findFirst({
    where: { tallerId: taller.id },
    orderBy: { numero: 'desc' },
    select: { numero: true },
  });
  let numero = (ultimo?.numero ?? 0) + 1;
  let creadas = 0;

  for (const m of MESES) {
    const esInvierno = factorAbrigo(m.mes) > 1;
    const producto = esInvierno ? chamarra : polera;
    const planificadas = esInvierno ? entero(8, 15) : entero(20, 35);
    // No todo sale bien: entre 0 y 2 prendas se arruinan
    const producidas = planificadas - entero(0, 2);
    const fecha = diaDe(m, entero(4, 12));

    const orden = await prisma.ordenProduccion.create({
      data: {
        tallerId: taller.id,
        numero: numero++,
        clienteNombre: ['Colegio Don Bosco', 'Feria 16 de Julio', 'Pedido particular', 'Tienda del Mercado'][entero(0, 3)],
        fechaPedido: fecha,
        estado: 'ENTREGADA',
        cantidadProducida: producidas,
        notas: `Producción del mes ${MARCA}`,
        detalles: {
          create: [{
            productoId: producto.id,
            cantidad: planificadas,
            precioUnitarioVenta: Number(producto.precioVenta),
          }],
        },
      },
    });

    // Costos reales acumulados, con variacion mes a mes
    const costoMat = Number(producto.precioVenta) * 0.42 * producidas * azar(0.9, 1.12);
    const manoObra = Number(producto.manoObraUnitaria) * producidas;
    const cif = azar(3, 9) * producidas;

    await prisma.ordenCosto.createMany({
      data: [
        { ordenId: orden.id, tipo: 'MATERIAL', descripcion: 'Materiales consumidos', monto: red(costoMat), fecha },
        { ordenId: orden.id, tipo: 'MANO_OBRA', descripcion: 'Mano de obra', monto: red(manoObra), fecha },
        { ordenId: orden.id, tipo: 'CIF', descripcion: 'Luz, alquiler y agua prorrateados', monto: red(cif), fecha },
      ],
    });
    creadas++;
  }
  console.log(`  ${creadas} órdenes de producción terminadas`);

  // ── Linea base: 3 meses ANTES del primer mes con datos ──────
  const primerMes = MESES[0];
  const antes = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(Date.UTC(primerMes.anio, primerMes.mes - 1 - (3 - i), 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  });

  await prisma.lineaBase.deleteMany({ where: { tallerId: taller.id, periodo: { in: antes } } });

  // El cuaderno NO registra menos plata porque se venda menos:
  // registra menos porque se olvidan las ventas chicas, no se
  // anotan los retiros y no se cuentan varios gastos. La plataforma
  // no hace vender mas — hace VER lo que ya pasaba.
  //
  // Por eso la linea base parte del mismo nivel de ventas y le
  // aplica el subregistro tipico: ~70 % de lo real.
  const ingresoRealMensual = 5000;

  for (const periodo of antes) {
    const ing = ingresoRealMensual * azar(0.62, 0.78);
    await prisma.lineaBase.create({
      data: {
        tallerId: taller.id,
        periodo,
        // Del cuaderno: subestima porque no anota todo
        ingresosDeclarados: red(ing),
        egresosDeclarados: red(ing * azar(0.55, 0.68)),
        // Los retiros son lo que MENOS se anota: sacar plata de la
        // caja para la casa casi nunca queda escrito.
        retirosDeclarados: red(azar(120, 260)),
        costoUnitarioEstimado: red(azar(35, 48)),
        // Antes del sistema no conocia el margen de casi ninguna prenda
        margenConocidoPct: red(azar(0, 15)),
        cifIdentificados: entero(0, 1),
        fuente: 'cuaderno',
        notas: 'Reconstruido de la entrevista y el cuaderno',
      },
    });
  }
  console.log(`  ${antes.length} meses de línea base (${antes[0]} a ${antes.at(-1)})`);

  // ── Resumen ─────────────────────────────────────────────────
  const total = await prisma.registro.aggregate({
    where: { tallerId: taller.id, esLineaBase: false, anuladoEn: null },
    _sum: { monto: true },
    _count: true,
  });

  const porTipo = await prisma.registro.groupBy({
    by: ['tipo'],
    where: { tallerId: taller.id, esLineaBase: false, anuladoEn: null },
    _sum: { monto: true },
  });

  const suma = (t) => Number(porTipo.find((x) => x.tipo === t)?._sum.monto ?? 0);
  const ganancia = suma('INGRESO') - suma('EGRESO') - suma('RETIRO');

  console.log(`
Listo. El taller ahora tiene historia:

  Movimientos     ${total._count}
  Ingresos        Bs. ${suma('INGRESO').toFixed(2)}
  Egresos         Bs. ${suma('EGRESO').toFixed(2)}
  Retiros         Bs. ${suma('RETIRO').toFixed(2)}
  ----------------------------------------
  Ganancia real   Bs. ${ganancia.toFixed(2)}

Con esto ya funcionan:
  · el gráfico del panel, con forma real
  · el pronóstico de demanda (hay más de 3 meses de ventas)
  · la estacionalidad: chamarras arriba en junio y julio
  · el comparativo antes/después, con la línea base cargada
  · las recomendaciones, con casos concretos

Para volver al estado limpio:  npm run db:reset && npm run db:seed
`);
}

main()
  .catch((e) => {
    console.error('Falló la generación:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
