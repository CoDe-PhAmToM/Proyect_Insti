// ============================================================
// REPORTES CONTABLES
//
// Todos los reportes se calculan ACA, no en el navegador. Antes
// cada vista sumaba por su cuenta y dos pantallas podian mostrar
// numeros distintos del mismo periodo. Un sistema contable no se
// puede permitir eso.
//
// El reporte que importa para la tesis es el COMPARATIVO: contrasta
// la linea base (lo que declaro el microempresario desde su
// cuaderno, antes de usar la plataforma) contra lo que el sistema
// registro durante el piloto. Es el objetivo especifico 5.
// ============================================================

import { prisma } from '../lib/prisma.js';
import { resultadoPeriodo, valorizarReceta, margenBrutoPct } from 'shared/costeo';

const dec = (v) => Number(v ?? 0);
const red = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export const rangoDelPeriodo = (periodo) => {
  const [a, m] = String(periodo).split('-').map(Number);
  return {
    inicio: new Date(Date.UTC(a, m - 1, 1)),
    fin: new Date(Date.UTC(a, m, 0, 23, 59, 59, 999)),
  };
};

export const periodoActual = () => {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

const traerRegistros = (tallerId, desde, hasta) =>
  prisma.registro.findMany({
    where: {
      tallerId,
      esLineaBase: false,
      ...(desde || hasta
        ? { fecha: { ...(desde ? { gte: desde } : {}), ...(hasta ? { lte: hasta } : {}) } }
        : {}),
    },
    orderBy: [{ fecha: 'asc' }, { creadoEn: 'asc' }],
    include: { categoria: true, producto: { select: { nombre: true, sku: true } } },
  });

// ── Estado de resultados ─────────────────────────────────────

export const estadoResultados = async ({ tallerId, desde, hasta }) => {
  const registros = (await traerRegistros(tallerId, desde, hasta)).map((r) => ({
    ...r,
    monto: dec(r.monto),
  }));

  const t = resultadoPeriodo(registros);

  const agrupar = (filtro) =>
    Object.entries(
      registros.filter(filtro).reduce((acc, r) => {
        acc[r.categoria.nombre] = red((acc[r.categoria.nombre] ?? 0) + r.monto);
        return acc;
      }, {})
    )
      .map(([categoria, monto]) => ({ categoria, monto }))
      .sort((a, b) => b.monto - a.monto);

  return {
    ingresos: { total: t.ingresos, porCategoria: agrupar((r) => r.tipo === 'INGRESO') },
    egresos: { total: t.egresos, porCategoria: agrupar((r) => r.tipo === 'EGRESO') },
    retiros: { total: t.retiros, porCategoria: agrupar((r) => r.tipo === 'RETIRO') },
    gananciaReal: t.gananciaReal,
    gananciaSinMezcla: t.gananciaSinMezcla,
    mezclaPersonal: t.mezclaPersonal,
    relacionCostoIngreso: t.relacionCostoIngreso,
    cantidadMovimientos: registros.length,
  };
};

// ── Flujo de caja ────────────────────────────────────────────

export const flujoCaja = async ({ tallerId, desde, hasta }) => {
  const registros = (await traerRegistros(tallerId, desde, hasta)).map((r) => ({
    ...r,
    monto: dec(r.monto),
  }));

  const porFecha = registros.reduce((acc, r) => {
    const k = r.fecha.toISOString().slice(0, 10);
    acc[k] ??= { fecha: k, entrada: 0, salida: 0 };
    if (r.tipo === 'INGRESO') acc[k].entrada = red(acc[k].entrada + r.monto);
    else acc[k].salida = red(acc[k].salida + r.monto);
    return acc;
  }, {});

  let saldo = 0;
  const filas = Object.values(porFecha)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((d) => {
      saldo = red(saldo + d.entrada - d.salida);
      return { ...d, neto: red(d.entrada - d.salida), saldoAcumulado: saldo };
    });

  const negativos = filas.filter((f) => f.saldoAcumulado < 0);

  return {
    filas,
    saldoFinal: saldo,
    // Los dias en rojo son la senal temprana de un problema de caja
    diasEnRojo: negativos.length,
    aviso: negativos.length
      ? `Hubo ${negativos.length} día${negativos.length !== 1 ? 's' : ''} en que saliste con la caja en negativo.`
      : null,
  };
};

// ── Kardex valorizado ────────────────────────────────────────

export const kardexValorizado = async ({ tallerId }) => {
  const materiales = await prisma.material.findMany({
    where: { tallerId, activo: true },
    orderBy: [{ categoria: 'asc' }, { codigo: 'asc' }],
  });

  const filas = materiales.map((m) => ({
    codigo: m.codigo,
    nombre: m.nombre,
    categoria: m.categoria,
    unidad: m.unidad,
    stock: dec(m.stock),
    stockMinimo: dec(m.stockMinimo),
    costoPromedio: dec(m.precioUnitario),
    valorTotal: red(dec(m.stock) * dec(m.precioUnitario)),
  }));

  return {
    filas,
    valorTotal: red(filas.reduce((a, f) => a + f.valorTotal, 0)),
    bajoMinimo: filas.filter((f) => f.stockMinimo > 0 && f.stock <= f.stockMinimo).length,
  };
};

// ── Costeo de productos ──────────────────────────────────────

export const costeoProductos = async ({ tallerId }) => {
  const [productos, materiales] = await Promise.all([
    prisma.producto.findMany({
      where: { tallerId, activo: true },
      orderBy: { nombre: 'asc' },
      include: { receta: true },
    }),
    prisma.material.findMany({ where: { tallerId } }),
  ]);

  const mats = materiales.map((m) => ({ ...m, precioUnitario: dec(m.precioUnitario) }));

  const filas = productos.map((p) => {
    const val = valorizarReceta(
      p.receta.map((r) => ({ materialId: r.materialId, cantidad: dec(r.cantidad) })),
      mats
    );
    const costoTotal = red(val.subtotal + dec(p.manoObraUnitaria));
    return {
      sku: p.sku,
      nombre: p.nombre,
      costoMateriales: val.subtotal,
      manoObra: dec(p.manoObraUnitaria),
      costoTotal,
      precioVenta: dec(p.precioVenta),
      margenBruto: red(dec(p.precioVenta) - costoTotal),
      margenPct: margenBrutoPct(dec(p.precioVenta), costoTotal),
      hayFaltantes: val.hayFaltantes,
    };
  });

  return {
    filas,
    aviso:
      'Estos costos no incluyen el gasto indirecto por prenda. El costo completo se ve en cada orden de producción terminada.',
  };
};

// ── Comparativo antes / despues: el objetivo 5 ───────────────

export const comparativoPiloto = async ({ tallerId }) => {
  const lineasBase = await prisma.lineaBase.findMany({
    where: { tallerId },
    orderBy: { periodo: 'asc' },
  });

  if (lineasBase.length === 0) {
    return {
      hayLineaBase: false,
      aviso:
        'Todavía no se cargó la línea base. Antes de empezar el piloto hay que registrar, desde el cuaderno del microempresario, lo que declaraba ganar y gastar. Sin ese punto de partida no se puede medir el cambio.',
      periodos: [],
    };
  }

  // Periodos con la plataforma: los que tienen movimientos reales
  const registros = await prisma.registro.findMany({
    where: { tallerId, esLineaBase: false },
    select: { fecha: true, tipo: true, monto: true, productoId: true },
  });

  const porPeriodo = registros.reduce((acc, r) => {
    const k = r.fecha.toISOString().slice(0, 7);
    acc[k] ??= [];
    acc[k].push({ ...r, monto: dec(r.monto) });
    return acc;
  }, {});

  const conPlataforma = Object.entries(porPeriodo)
    .map(([periodo, regs]) => {
      const t = resultadoPeriodo(regs);
      return {
        periodo,
        fuente: 'plataforma',
        ingresos: t.ingresos,
        egresos: t.egresos,
        retiros: t.retiros,
        ganancia: t.gananciaReal,
        movimientos: regs.length,
        // Indicador de la tesis: % de ventas ligadas a una prenda
        // concreta, o sea de cuantas se conoce el margen real
        ventasConPrenda: regs.filter((r) => r.tipo === 'INGRESO' && r.productoId).length,
        ventasTotales: regs.filter((r) => r.tipo === 'INGRESO').length,
      };
    })
    .sort((a, b) => a.periodo.localeCompare(b.periodo));

  const antes = lineasBase.map((l) => ({
    periodo: l.periodo,
    fuente: 'cuaderno',
    ingresos: dec(l.ingresosDeclarados),
    egresos: dec(l.egresosDeclarados),
    retiros: dec(l.retirosDeclarados),
    ganancia: red(dec(l.ingresosDeclarados) - dec(l.egresosDeclarados) - dec(l.retirosDeclarados)),
    costoUnitarioEstimado: l.costoUnitarioEstimado != null ? dec(l.costoUnitarioEstimado) : null,
    margenConocidoPct: l.margenConocidoPct != null ? dec(l.margenConocidoPct) : null,
    cifIdentificados: l.cifIdentificados,
  }));

  const prom = (arr, campo) =>
    arr.length ? red(arr.reduce((a, x) => a + (x[campo] ?? 0), 0) / arr.length) : 0;

  const gananciaAntes = prom(antes, 'ganancia');
  const gananciaDespues = prom(conPlataforma, 'ganancia');

  const cifDespues = await prisma.costoFijo.count({ where: { tallerId } });
  const cifAntes = antes.length ? Math.round(prom(antes, 'cifIdentificados')) : 0;

  const totalVentas = conPlataforma.reduce((a, p) => a + p.ventasTotales, 0);
  const conPrenda = conPlataforma.reduce((a, p) => a + p.ventasConPrenda, 0);

  return {
    hayLineaBase: true,
    antes,
    despues: conPlataforma,
    // Los tres indicadores que pide la operativizacion de variables
    indicadores: {
      gananciaMensual: {
        antes: gananciaAntes,
        despues: gananciaDespues,
        diferencia: red(gananciaDespues - gananciaAntes),
        variacionPct:
          gananciaAntes !== 0 ? red(((gananciaDespues - gananciaAntes) / Math.abs(gananciaAntes)) * 100) : null,
      },
      margenConocido: {
        antes: antes.length ? prom(antes, 'margenConocidoPct') : 0,
        despues: totalVentas > 0 ? red((conPrenda / totalVentas) * 100) : 0,
        unidad: '% de ventas de las que se conoce el margen real',
      },
      cifIdentificados: {
        antes: cifAntes,
        despues: cifDespues,
        unidad: 'costos indirectos identificados y registrados',
      },
    },
    aviso:
      conPlataforma.length === 0
        ? 'Hay línea base cargada pero todavía no hay movimientos registrados en la plataforma. El comparativo se completa cuando el taller empiece a usar el sistema.'
        : conPlataforma.length < 2
          ? 'Con un solo período registrado la comparación es preliminar. Para el análisis estadístico del piloto hacen falta al menos tres meses.'
          : null,
  };
};
