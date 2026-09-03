// ============================================================
// MOTOR DE RECOMENDACIONES
//
// Reemplaza la pantalla que decia "247 movimientos analizados" y
// recomendaba sobre productos que no existian en los datos.
//
// REGLA DURA DE ESTE MODULO: toda recomendacion guarda en datosJson
// las cifras exactas que la originaron, y la pantalla las muestra.
// Si dice que analizo 34 ventas, hay 34 filas en la base detras.
// Nada se afirma sin respaldo.
//
// Dos capas:
//   1. Reglas con umbrales sobre datos reales del taller
//   2. Pronostico estadistico (media movil y tendencia)
//
// Corre en el servidor, sin llamadas externas ni costo por uso.
// ============================================================

import { prisma } from '../lib/prisma.js';
import { valorizarReceta, margenBrutoPct, resultadoPeriodo, puntoEquilibrio, costosFijosDelPeriodo } from 'shared/costeo';
import { pronosticar } from 'shared/pronostico';

const dec = (v) => Number(v ?? 0);
const red = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const DIAS_SIN_ROTACION = 45;
const MARGEN_DELGADO_PCT = 20;
const MEZCLA_ALTA_PCT = 15;

const periodoDe = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

/**
 * Genera todas las recomendaciones del taller y las persiste.
 * Se borran las anteriores no descartadas: son una foto del momento,
 * no un historial.
 */
export const generarRecomendaciones = async (tallerId) => {
  const hoy = new Date();
  const inicioMes = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1));

  const [materiales, productos, registros, costosFijos, ordenes] = await Promise.all([
    prisma.material.findMany({ where: { tallerId, activo: true } }),
    prisma.producto.findMany({ where: { tallerId, activo: true }, include: { receta: true } }),
    prisma.registro.findMany({
      where: { tallerId, esLineaBase: false },
      select: { fecha: true, tipo: true, monto: true, origen: true, productoId: true, cantidad: true },
      orderBy: { fecha: 'asc' },
    }),
    prisma.costoFijo.findMany({ where: { tallerId } }),
    prisma.ordenProduccion.findMany({
      where: { tallerId, estado: { in: ['TERMINADA', 'ENTREGADA'] } },
      select: { cantidadProducida: true, fechaPedido: true },
    }),
  ]);

  const regs = registros.map((r) => ({ ...r, monto: dec(r.monto), cantidad: dec(r.cantidad) }));
  const mats = materiales.map((m) => ({ ...m, precioUnitario: dec(m.precioUnitario) }));
  const fijos = costosFijos.map((c) => ({ ...c, montoMensual: dec(c.montoMensual) }));

  const recomendaciones = [
    ...reglasDeStock(mats),
    ...reglasDePrecio(productos, mats),
    ...reglasDeRotacion(productos, regs, hoy),
    ...reglasDeFinanzas(regs, inicioMes),
    ...reglasDeEquilibrio(productos, mats, fijos, regs, hoy),
    ...pronosticoDemanda(productos, regs),
  ];

  // Se ordenan por severidad: lo critico primero
  const peso = { CRITICA: 0, ADVERTENCIA: 1, INFO: 2 };
  recomendaciones.sort((a, b) => peso[a.severidad] - peso[b.severidad]);

  await prisma.$transaction([
    prisma.recomendacion.deleteMany({ where: { tallerId, descartada: false } }),
    prisma.recomendacion.createMany({
      data: recomendaciones.map((r) => ({ ...r, tallerId })),
    }),
  ]);

  return {
    generadas: recomendaciones.length,
    analizado: {
      movimientos: regs.length,
      materiales: mats.length,
      productos: productos.length,
      ordenes: ordenes.length,
      desde: regs[0]?.fecha ?? null,
      hasta: regs.at(-1)?.fecha ?? null,
    },
  };
};

// ── Reglas de inventario ─────────────────────────────────────

const reglasDeStock = (materiales) =>
  materiales
    .filter((m) => dec(m.stockMinimo) > 0 && dec(m.stock) <= dec(m.stockMinimo) * 0.5)
    .map((m) => ({
      tipo: 'ALERTA',
      severidad: 'CRITICA',
      titulo: `Te estás quedando sin ${m.nombre}`,
      mensaje: `Quedan ${dec(m.stock)} ${m.unidad} y tu mínimo es ${dec(m.stockMinimo)}. Si no comprás, vas a tener que parar la producción.`,
      accion: 'Registrar una compra',
      datosJson: {
        material: m.nombre,
        codigo: m.codigo,
        stockActual: dec(m.stock),
        stockMinimo: dec(m.stockMinimo),
        unidad: m.unidad,
        faltante: red(dec(m.stockMinimo) - dec(m.stock)),
      },
    }));

// ── Reglas de precio ─────────────────────────────────────────

const reglasDePrecio = (productos, materiales) => {
  const salida = [];

  for (const p of productos) {
    if (p.receta.length === 0) continue;

    const val = valorizarReceta(
      p.receta.map((r) => ({ materialId: r.materialId, cantidad: dec(r.cantidad) })),
      materiales
    );
    const costo = red(val.subtotal + dec(p.manoObraUnitaria));
    const precio = dec(p.precioVenta);
    const margen = margenBrutoPct(precio, costo);

    const evidencia = {
      producto: p.nombre,
      sku: p.sku,
      costoMateriales: val.subtotal,
      manoObra: dec(p.manoObraUnitaria),
      costoTotal: costo,
      precioVenta: precio,
      margenPct: margen,
      gananciaUnitaria: red(precio - costo),
    };

    if (precio > 0 && precio < costo) {
      salida.push({
        tipo: 'PRECIO',
        severidad: 'CRITICA',
        titulo: `Estás perdiendo plata con cada ${p.nombre}`,
        mensaje: `Hacerla te cuesta Bs. ${costo.toFixed(2)} y la vendés a Bs. ${precio.toFixed(2)}. Perdés Bs. ${(costo - precio).toFixed(2)} por cada una que sale.`,
        accion: 'Revisar el precio',
        datosJson: evidencia,
      });
    } else if (precio > 0 && margen < MARGEN_DELGADO_PCT) {
      salida.push({
        tipo: 'PRECIO',
        severidad: 'ADVERTENCIA',
        titulo: `El margen de ${p.nombre} es muy delgado`,
        mensaje: `Te queda Bs. ${(precio - costo).toFixed(2)} por prenda, apenas el ${margen.toFixed(1)} % del precio. Si sube la tela, te quedás sin ganancia.`,
        accion: 'Ver simulación de precio',
        datosJson: evidencia,
      });
    }
  }

  return salida;
};

// ── Reglas de rotacion ───────────────────────────────────────

const reglasDeRotacion = (productos, registros, hoy) => {
  const ventas = registros.filter((r) => r.tipo === 'INGRESO' && r.productoId);

  return productos
    .map((p) => {
      const suyas = ventas.filter((v) => v.productoId === p.id);
      if (suyas.length === 0) return null;

      const ultima = suyas.at(-1).fecha;
      const dias = Math.floor((hoy - ultima) / (24 * 3600 * 1000));
      if (dias < DIAS_SIN_ROTACION) return null;

      return {
        tipo: 'ALERTA',
        severidad: 'ADVERTENCIA',
        titulo: `Hace ${dias} días que no vendés ${p.nombre}`,
        mensaje: `La última venta fue el ${ultima.toISOString().slice(0, 10).split('-').reverse().join('/')}. Si tenés stock parado, es plata inmovilizada.`,
        accion: 'Ver el producto',
        datosJson: {
          producto: p.nombre,
          sku: p.sku,
          diasSinVender: dias,
          ultimaVenta: ultima,
          ventasHistoricas: suyas.length,
        },
      };
    })
    .filter(Boolean);
};

// ── Reglas de finanzas ───────────────────────────────────────

const reglasDeFinanzas = (registros, inicioMes) => {
  const delMes = registros.filter((r) => r.fecha >= inicioMes);
  if (delMes.length === 0) return [];

  const t = resultadoPeriodo(delMes);
  const salida = [];

  if (t.ingresos > 0 && t.egresos + t.retiros > t.ingresos) {
    salida.push({
      tipo: 'ALERTA',
      severidad: 'CRITICA',
      titulo: 'Este mes está saliendo más plata de la que entra',
      mensaje: `Entraron Bs. ${t.ingresos.toFixed(2)} y salieron Bs. ${(t.egresos + t.retiros).toFixed(2)}. Vas Bs. ${Math.abs(t.gananciaReal).toFixed(2)} en rojo.`,
      accion: 'Ver los movimientos del mes',
      datosJson: {
        ingresos: t.ingresos,
        egresos: t.egresos,
        retiros: t.retiros,
        resultado: t.gananciaReal,
        movimientosAnalizados: delMes.length,
      },
    });
  }

  if (t.ingresos > 0 && t.mezclaPersonal > 0) {
    const pct = red((t.mezclaPersonal / t.ingresos) * 100);
    if (pct > MEZCLA_ALTA_PCT) {
      salida.push({
        tipo: 'ALERTA',
        severidad: 'ADVERTENCIA',
        titulo: 'Estás sacando mucha plata del negocio para la casa',
        mensaje: `Este mes retiraste Bs. ${t.mezclaPersonal.toFixed(2)}, el ${pct.toFixed(0)} % de todo lo que entró. Sin esos retiros tu ganancia sería Bs. ${t.gananciaSinMezcla.toFixed(2)} en vez de Bs. ${t.gananciaReal.toFixed(2)}.`,
        accion: 'Ver el desglose',
        datosJson: {
          retirado: t.mezclaPersonal,
          ingresos: t.ingresos,
          porcentaje: pct,
          gananciaReal: t.gananciaReal,
          gananciaSinMezcla: t.gananciaSinMezcla,
        },
      });
    }
  }

  return salida;
};

// ── Regla de punto de equilibrio ─────────────────────────────

const reglasDeEquilibrio = (productos, materiales, costosFijos, registros, hoy) => {
  const periodo = periodoDe(hoy);
  const totalFijos = costosFijosDelPeriodo(costosFijos, periodo);
  if (totalFijos === 0) return [];

  const inicioMes = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1));
  const vendidasMes = registros
    .filter((r) => r.tipo === 'INGRESO' && r.fecha >= inicioMes)
    .reduce((a, r) => a + (r.cantidad || 0), 0);

  // Se toma el producto principal: el de mejor margen de contribucion
  const conMargen = productos
    .filter((p) => p.receta.length > 0 && dec(p.precioVenta) > 0)
    .map((p) => {
      const val = valorizarReceta(
        p.receta.map((r) => ({ materialId: r.materialId, cantidad: dec(r.cantidad) })),
        materiales
      );
      const variable = red(val.subtotal + dec(p.manoObraUnitaria));
      return { p, variable, pe: puntoEquilibrio(totalFijos, dec(p.precioVenta), variable) };
    })
    .filter((x) => x.pe.alcanzable)
    .sort((a, b) => a.pe.unidades - b.pe.unidades);

  if (conMargen.length === 0) return [];

  const mejor = conMargen[0];
  if (vendidasMes >= mejor.pe.unidades) return [];

  const faltan = mejor.pe.unidades - vendidasMes;

  return [
    {
      tipo: 'OPORTUNIDAD',
      severidad: vendidasMes === 0 ? 'ADVERTENCIA' : 'INFO',
      titulo: `Te faltan ${faltan} prendas para cubrir los gastos del mes`,
      mensaje: `Tus gastos fijos son Bs. ${totalFijos.toFixed(2)} al mes. Vendiendo ${mejor.pe.unidades} ${mejor.p.nombre} los cubrís. Este mes llevás ${vendidasMes}.`,
      accion: 'Ver punto de equilibrio',
      datosJson: {
        costosFijosMensuales: totalFijos,
        producto: mejor.p.nombre,
        puntoEquilibrio: mejor.pe.unidades,
        vendidasEsteMes: vendidasMes,
        faltan,
        margenContribucion: mejor.pe.margenContribucionUnitario,
      },
    },
  ];
};

// ── Pronostico de demanda ────────────────────────────────────

const pronosticoDemanda = (productos, registros) => {
  const salida = [];

  for (const p of productos) {
    const ventas = registros.filter(
      (r) => r.tipo === 'INGRESO' && r.productoId === p.id && r.cantidad > 0
    );
    if (ventas.length === 0) continue;

    // Unidades por mes, del mas viejo al mas nuevo
    const porMes = ventas.reduce((acc, v) => {
      const k = periodoDe(v.fecha);
      acc[k] = (acc[k] ?? 0) + v.cantidad;
      return acc;
    }, {});

    const meses = Object.keys(porMes).sort();
    const serie = meses.map((m) => porMes[m]);
    const pron = pronosticar(serie, p.nombre);

    // Sin datos suficientes no se emite recomendacion: mejor callar
    // que afirmar una tendencia que no existe.
    if (!pron.suficiente) continue;

    salida.push({
      tipo: 'PRONOSTICO',
      severidad: 'INFO',
      // El titulo solo afirma una direccion si la tendencia es
      // confiable. Antes decia "vienen subiendo" y el mensaje de
      // abajo decia "varian demasiado para marcar una tendencia":
      // la pantalla se contradecia a si misma.
      titulo: !pron.tendencia.confiable
        ? `${p.nombre}: ventas irregulares`
        : pron.tendencia.direccion === 'sube'
          ? `${p.nombre}: las ventas vienen subiendo`
          : pron.tendencia.direccion === 'baja'
            ? `${p.nombre}: las ventas vienen bajando`
            : `${p.nombre}: ventas parejas`,
      mensaje: pron.mensaje,
      accion: 'Planificar producción',
      datosJson: {
        producto: p.nombre,
        sku: p.sku,
        mesesAnalizados: meses.length,
        serie: meses.map((m, i) => ({ mes: m, unidades: serie[i] })),
        estimadoProximoMes: pron.estimado,
        mediaMovil: pron.mediaMovil,
        pendiente: pron.tendencia.pendiente,
        r2: pron.tendencia.r2,
        metodo: pron.tendencia.confiable ? 'tendencia lineal' : 'media móvil',
      },
    });
  }

  return salida;
};
