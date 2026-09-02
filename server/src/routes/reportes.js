// ============================================================
// RUTAS: REPORTES
// Los cuatro que ya existian, ahora calculados en el servidor, mas
// el comparativo antes/despues que exige el objetivo 5.
// ============================================================

import { Router } from 'express';

import { prisma } from '../lib/prisma.js';
import { errores } from '../lib/errores.js';
import { autenticar } from '../middleware/auth.js';
import { conTaller, exigirTaller, scope, bloquearAyudante } from '../middleware/tenancy.js';
import {
  estadoResultados,
  flujoCaja,
  kardexValorizado,
  costeoProductos,
  comparativoPiloto,
  rangoDelPeriodo,
  periodoActual,
} from '../services/reportes.js';
import { generarPDF, generarExcel, nombreArchivo } from '../services/exportar.js';
import { nombrePeriodo, fechaCorta } from 'shared/formato';

export const rutasReportes = Router();

rutasReportes.use(autenticar, conTaller, exigirTaller, bloquearAyudante);

const TIPOS = ['estado-resultados', 'flujo-caja', 'kardex', 'costeo', 'comparativo'];

const armarDatos = async (tipo, tallerId, periodo) => {
  const { inicio, fin } = rangoDelPeriodo(periodo);

  switch (tipo) {
    case 'estado-resultados':
      return estadoResultados({ tallerId, desde: inicio, hasta: fin });
    case 'flujo-caja':
      return flujoCaja({ tallerId, desde: inicio, hasta: fin });
    case 'kardex':
      return kardexValorizado({ tallerId });
    case 'costeo':
      return costeoProductos({ tallerId });
    case 'comparativo':
      return comparativoPiloto({ tallerId });
    default:
      throw errores.datosInvalidos(`Reporte desconocido: ${tipo}`);
  }
};

// ── GET /:tipo ───────────────────────────────────────────────

rutasReportes.get('/:tipo', async (req, res) => {
  const { tipo } = req.params;
  if (!TIPOS.includes(tipo)) throw errores.noEncontrado('Ese reporte');

  const periodo = req.query.periodo ?? periodoActual();
  const datos = await armarDatos(tipo, req.tallerId, periodo);

  res.json({ tipo, periodo, nombrePeriodo: nombrePeriodo(periodo), ...datos });
});

// ── GET /:tipo/export ────────────────────────────────────────

rutasReportes.get('/:tipo/export', async (req, res) => {
  const { tipo } = req.params;
  const formato = req.query.formato === 'xlsx' ? 'xlsx' : 'pdf';

  if (!TIPOS.includes(tipo)) throw errores.noEncontrado('Ese reporte');

  const periodo = req.query.periodo ?? periodoActual();
  const [datos, taller] = await Promise.all([
    armarDatos(tipo, req.tallerId, periodo),
    prisma.taller.findUnique({
      where: { id: req.tallerId },
      select: { nombre: true, distrito: true },
    }),
  ]);

  const plantilla = PLANTILLAS[tipo](datos, periodo);
  const archivo = nombreArchivo(plantilla.titulo, periodo, formato);

  if (formato === 'xlsx') {
    const buffer = await generarExcel({ titulo: plantilla.titulo, taller, hojas: plantilla.hojas });
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${archivo}"`);
    return res.send(Buffer.from(buffer));
  }

  const buffer = await generarPDF({
    titulo: plantilla.titulo,
    subtitulo: plantilla.subtitulo,
    taller,
    secciones: plantilla.secciones,
  });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${archivo}"`);
  res.send(buffer);
});

// ── Plantillas de cada reporte ───────────────────────────────
// Definen una sola vez el titulo, las columnas y las notas, y de
// ahi salen tanto el PDF como el Excel.

const PLANTILLAS = {
  'estado-resultados': (d, periodo) => {
    const filas = [
      ...d.ingresos.porCategoria.map((c) => ({ concepto: c.categoria, monto: c.monto, tipo: 'Ingreso' })),
      ...d.egresos.porCategoria.map((c) => ({ concepto: c.categoria, monto: -c.monto, tipo: 'Egreso' })),
      ...d.retiros.porCategoria.map((c) => ({ concepto: c.categoria, monto: -c.monto, tipo: 'Retiro' })),
    ];

    const columnas = [
      { titulo: 'Concepto', campo: 'concepto', ancho: 0.5 },
      { titulo: 'Tipo', campo: 'tipo', ancho: 0.2 },
      { titulo: 'Monto', campo: 'monto', ancho: 0.3, alinear: 'right', moneda: true },
    ];

    return {
      titulo: 'Estado de Resultados',
      subtitulo: nombrePeriodo(periodo),
      secciones: [
        {
          titulo: 'Movimientos por categoría',
          columnas,
          filas,
          total: { label: 'Ganancia real del período', valor: d.gananciaReal },
        },
        {
          titulo: 'Separación de finanzas',
          texto: `Se retiraron ${d.mezclaPersonal.toFixed(2)} Bs. de la caja del negocio para gastos personales. Sin esa mezcla, la ganancia habría sido ${d.gananciaSinMezcla.toFixed(2)} Bs.`,
        },
      ],
      hojas: [
        {
          nombre: 'Estado de Resultados',
          subtitulo: nombrePeriodo(periodo),
          columnas,
          filas: [
            ...filas,
            { concepto: 'GANANCIA REAL', tipo: '', monto: d.gananciaReal, _destacar: true },
          ],
          nota: `Ganancia sin mezcla personal: Bs. ${d.gananciaSinMezcla.toFixed(2)}`,
        },
      ],
    };
  },

  'flujo-caja': (d, periodo) => {
    const columnas = [
      { titulo: 'Fecha', campo: 'fechaTexto', ancho: 0.22 },
      { titulo: 'Entró', campo: 'entrada', ancho: 0.2, alinear: 'right', moneda: true },
      { titulo: 'Salió', campo: 'salida', ancho: 0.2, alinear: 'right', moneda: true },
      { titulo: 'Neto', campo: 'neto', ancho: 0.18, alinear: 'right', moneda: true },
      { titulo: 'Saldo', campo: 'saldoAcumulado', ancho: 0.2, alinear: 'right', moneda: true },
    ];
    const filas = d.filas.map((f) => ({ ...f, fechaTexto: fechaCorta(f.fecha) }));

    return {
      titulo: 'Flujo de Caja',
      subtitulo: nombrePeriodo(periodo),
      secciones: [
        {
          columnas,
          filas,
          total: { label: 'Saldo al cierre del período', valor: d.saldoFinal },
        },
        ...(d.aviso ? [{ titulo: 'Atención', texto: d.aviso }] : []),
      ],
      hojas: [{ nombre: 'Flujo de Caja', subtitulo: nombrePeriodo(periodo), columnas, filas, nota: d.aviso }],
    };
  },

  kardex: (d) => {
    const columnas = [
      { titulo: 'Código', campo: 'codigo', ancho: 0.15 },
      { titulo: 'Material', campo: 'nombre', ancho: 0.32 },
      { titulo: 'Stock', campo: 'stock', ancho: 0.13, alinear: 'right' },
      { titulo: 'Unidad', campo: 'unidad', ancho: 0.13 },
      { titulo: 'Costo prom.', campo: 'costoPromedio', ancho: 0.13, alinear: 'right', moneda: true },
      { titulo: 'Valor', campo: 'valorTotal', ancho: 0.14, alinear: 'right', moneda: true },
    ];

    return {
      titulo: 'Kardex Valorizado',
      subtitulo: 'Inventario a la fecha, valorizado a promedio ponderado',
      secciones: [
        { columnas, filas: d.filas, total: { label: 'Valor total del inventario', valor: d.valorTotal } },
        ...(d.bajoMinimo
          ? [{ titulo: 'Atención', texto: `${d.bajoMinimo} material(es) están en o por debajo del mínimo.` }]
          : []),
      ],
      hojas: [
        {
          nombre: 'Kardex',
          subtitulo: 'Valorizado a promedio ponderado',
          columnas,
          filas: d.filas,
          nota: 'Cada salida se valoriza al costo promedio vigente al momento del consumo.',
        },
      ],
    };
  },

  costeo: (d) => {
    const columnas = [
      { titulo: 'SKU', campo: 'sku', ancho: 0.16 },
      { titulo: 'Producto', campo: 'nombre', ancho: 0.28 },
      { titulo: 'Materiales', campo: 'costoMateriales', ancho: 0.15, alinear: 'right', moneda: true },
      { titulo: 'Mano obra', campo: 'manoObra', ancho: 0.13, alinear: 'right', moneda: true },
      { titulo: 'Costo', campo: 'costoTotal', ancho: 0.14, alinear: 'right', moneda: true },
      { titulo: 'Margen %', campo: 'margenPct', ancho: 0.14, alinear: 'right', porcentaje: true },
    ];

    return {
      titulo: 'Costeo de Productos',
      subtitulo: 'Costo unitario contra precios vigentes del inventario',
      secciones: [{ columnas, filas: d.filas }, { titulo: 'Nota', texto: d.aviso }],
      hojas: [{ nombre: 'Costeo', columnas, filas: d.filas, nota: d.aviso }],
    };
  },

  comparativo: (d) => {
    if (!d.hayLineaBase) {
      return {
        titulo: 'Comparativo Antes y Después',
        subtitulo: 'Sin datos suficientes',
        secciones: [{ titulo: 'Falta la línea base', texto: d.aviso }],
        hojas: [{ nombre: 'Comparativo', columnas: [{ titulo: 'Aviso', campo: 'aviso' }], filas: [{ aviso: d.aviso }] }],
      };
    }

    const columnas = [
      { titulo: 'Período', campo: 'periodo', ancho: 0.2 },
      { titulo: 'Fuente', campo: 'fuente', ancho: 0.2 },
      { titulo: 'Ingresos', campo: 'ingresos', ancho: 0.2, alinear: 'right', moneda: true },
      { titulo: 'Egresos', campo: 'egresos', ancho: 0.2, alinear: 'right', moneda: true },
      { titulo: 'Ganancia', campo: 'ganancia', ancho: 0.2, alinear: 'right', moneda: true },
    ];

    const i = d.indicadores;
    const filasInd = [
      {
        indicador: 'Ganancia mensual promedio',
        antes: i.gananciaMensual.antes,
        despues: i.gananciaMensual.despues,
        diferencia: i.gananciaMensual.diferencia,
      },
      {
        indicador: '% de ventas con margen conocido',
        antes: i.margenConocido.antes,
        despues: i.margenConocido.despues,
        diferencia: Number((i.margenConocido.despues - i.margenConocido.antes).toFixed(2)),
      },
      {
        indicador: 'Costos indirectos identificados',
        antes: i.cifIdentificados.antes,
        despues: i.cifIdentificados.despues,
        diferencia: i.cifIdentificados.despues - i.cifIdentificados.antes,
      },
    ];

    const colInd = [
      { titulo: 'Indicador', campo: 'indicador', ancho: 0.4 },
      { titulo: 'Antes', campo: 'antes', ancho: 0.2, alinear: 'right' },
      { titulo: 'Después', campo: 'despues', ancho: 0.2, alinear: 'right' },
      { titulo: 'Diferencia', campo: 'diferencia', ancho: 0.2, alinear: 'right' },
    ];

    return {
      titulo: 'Comparativo Antes y Después',
      subtitulo: 'Validación del piloto — objetivo específico 5',
      secciones: [
        {
          titulo: 'Indicadores clave',
          columnas: colInd,
          filas: filasInd,
        },
        {
          titulo: 'Antes: registros del cuaderno',
          columnas,
          filas: d.antes,
        },
        {
          titulo: 'Después: registros de la plataforma',
          columnas,
          filas: d.despues,
        },
        ...(d.aviso ? [{ titulo: 'Nota metodológica', texto: d.aviso }] : []),
      ],
      hojas: [
        { nombre: 'Indicadores', columnas: colInd, filas: filasInd, nota: d.aviso },
        { nombre: 'Antes (cuaderno)', columnas, filas: d.antes },
        { nombre: 'Despues (plataforma)', columnas, filas: d.despues },
      ],
    };
  },
};
