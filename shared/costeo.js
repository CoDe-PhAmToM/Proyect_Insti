// ============================================================
// MOTOR DE COSTEO
// Corazon del objetivo especifico 3 de la tesis: costo unitario
// real por prenda, margen de contribucion y punto de equilibrio.
//
// Funciones puras, sin dependencias. Viven aca porque el cliente
// necesita vista previa instantanea (mover el margen) y el servidor
// necesita el calculo autoritativo que se guarda. Duplicar estas
// formulas seria garantia de que se desincronicen.
// ============================================================

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const redondear = (n, d = 2) => {
  const f = 10 ** d;
  return Math.round((num(n) + Number.EPSILON) * f) / f;
};

// ── Costo de materiales ──────────────────────────────────────

/**
 * Valoriza la receta (BOM) de un producto contra los precios vigentes.
 * Un material borrado del inventario no rompe el calculo: se marca
 * como faltante para que la interfaz lo advierta.
 *
 * @param {Array<{materialId:string, cantidad:number}>} receta
 * @param {Array<{id:string, nombre:string, unidad:string, precioUnitario:number}>} materiales
 */
export const valorizarReceta = (receta = [], materiales = []) => {
  const porId = new Map(materiales.map((m) => [m.id, m]));

  const lineas = receta.map((item) => {
    const mat = porId.get(item.materialId);
    const precio = num(mat?.precioUnitario);
    const cantidad = num(item.cantidad);
    return {
      materialId: item.materialId,
      nombre: mat?.nombre ?? 'Material eliminado del inventario',
      unidad: mat?.unidad ?? '',
      cantidad,
      precioUnitario: precio,
      subtotal: redondear(precio * cantidad),
      faltante: !mat,
    };
  });

  return {
    lineas,
    subtotal: redondear(lineas.reduce((a, l) => a + l.subtotal, 0)),
    hayFaltantes: lineas.some((l) => l.faltante),
  };
};

// ── Costos indirectos de fabricacion ─────────────────────────

/**
 * Prorratea los costos fijos del mes entre las unidades producidas.
 *
 * Resuelve lo que el documento cita de Martinez (2023): las micro-
 * empresas "no consideran los costos indirectos para determinar los
 * costos de produccion". Aca el CIF deja de ser un numero que el
 * usuario escribe a mano y pasa a salir de los egresos ya registrados.
 *
 * Base de distribucion simplificada = unidades producidas en el mes,
 * que es la que el documento pide ("bases de distribucion simplificadas
 * que reflejen el consumo real de recursos").
 */
export const cifUnitario = (costosFijosMensuales = 0, unidadesProducidasMes = 0) => {
  const unidades = num(unidadesProducidasMes);
  if (unidades <= 0) return 0;
  return redondear(num(costosFijosMensuales) / unidades, 4);
};

/** Suma los costos fijos vigentes en un periodo dado. */
export const costosFijosDelPeriodo = (costosFijos = [], periodo) => {
  const [a, m] = String(periodo).split('-').map(Number);
  const inicio = new Date(a, (m || 1) - 1, 1);
  const fin = new Date(a, m || 1, 0);

  return redondear(
    costosFijos
      .filter((c) => {
        const desde = new Date(c.vigenteDesde);
        const hasta = c.vigenteHasta ? new Date(c.vigenteHasta) : null;
        return desde <= fin && (!hasta || hasta >= inicio);
      })
      .reduce((acc, c) => acc + num(c.montoMensual), 0)
  );
};

// ── Costeo por orden de produccion ───────────────────────────

/**
 * Costeo por ordenes: acumula los tres elementos del costo sobre una
 * orden concreta y los divide entre lo realmente producido.
 *
 * A diferencia del costeo estandar por producto, aca los materiales
 * son los REALMENTE consumidos (con su costo al momento del consumo),
 * no los teoricos de la receta.
 *
 * @param {object} p
 * @param {number} p.costoMateriales  suma de OrdenCosto tipo MATERIAL
 * @param {number} p.costoManoObra    suma de OrdenCosto tipo MANO_OBRA
 * @param {number} p.costoCif         suma de OrdenCosto tipo CIF
 * @param {number} p.cantidadProducida
 */
export const costearOrden = ({
  costoMateriales = 0,
  costoManoObra = 0,
  costoCif = 0,
  cantidadProducida = 0,
} = {}) => {
  const materiales = num(costoMateriales);
  const manoObra = num(costoManoObra);
  const cif = num(costoCif);
  const unidades = num(cantidadProducida);

  const costoTotal = redondear(materiales + manoObra + cif);
  const costoVariableTotal = redondear(materiales + manoObra);

  return {
    costoMateriales: redondear(materiales),
    costoManoObra: redondear(manoObra),
    costoCif: redondear(cif),
    costoTotal,
    costoVariableTotal,
    cantidadProducida: unidades,
    costoUnitario: unidades > 0 ? redondear(costoTotal / unidades) : 0,
    costoVariableUnitario: unidades > 0 ? redondear(costoVariableTotal / unidades) : 0,
  };
};

// ── Indicadores de rentabilidad ──────────────────────────────

/** Margen de contribucion unitario = precio de venta - costo variable unitario. */
export const margenContribucion = (precioVenta, costoVariableUnitario) =>
  redondear(num(precioVenta) - num(costoVariableUnitario));

/**
 * Punto de equilibrio: cuantas unidades hay que vender en el mes para
 * que los ingresos igualen a los costos totales.
 *
 * Devuelve `alcanzable: false` cuando el margen de contribucion es
 * cero o negativo — ahi el negocio pierde plata en cada unidad y
 * ningun volumen de ventas lo salva. Es un caso real y frecuente en
 * el sector, no un error de calculo.
 */
export const puntoEquilibrio = (costosFijosMensuales, precioVenta, costoVariableUnitario) => {
  const mc = margenContribucion(precioVenta, costoVariableUnitario);
  const cf = num(costosFijosMensuales);

  if (mc <= 0) {
    return {
      alcanzable: false,
      margenContribucionUnitario: mc,
      unidades: null,
      montoBs: null,
      motivo:
        mc === 0
          ? 'El precio de venta iguala al costo variable: cada prenda no deja nada para cubrir los gastos fijos.'
          : 'El precio de venta esta por debajo del costo variable: se pierde plata en cada prenda vendida.',
    };
  }

  const unidades = Math.ceil(cf / mc);
  return {
    alcanzable: true,
    margenContribucionUnitario: mc,
    unidades,
    montoBs: redondear(unidades * num(precioVenta)),
    motivo: null,
  };
};

/** Margen bruto porcentual sobre el precio de venta. */
export const margenBrutoPct = (precioVenta, costoUnitarioTotal) => {
  const pv = num(precioVenta);
  if (pv <= 0) return 0;
  return redondear(((pv - num(costoUnitarioTotal)) / pv) * 100);
};

/** Precio sugerido a partir de un margen deseado sobre el costo. */
export const precioSugerido = (costoUnitarioTotal, margenPct) =>
  redondear(num(costoUnitarioTotal) * (1 + num(margenPct) / 100));

/** Relacion costo/ingreso: cuanto cuesta generar cada boliviano de venta. */
export const relacionCostoIngreso = (costosTotales, ingresosTotales) => {
  const ing = num(ingresosTotales);
  if (ing <= 0) return null;
  return redondear(num(costosTotales) / ing, 4);
};

// ── Resultado del periodo ────────────────────────────────────

/**
 * Ganancia real segun la formula del documento:
 *   ingresos - egresos - retiros
 *
 * `gananciaSinMezcla` muestra cuanto seria la ganancia si el dueño no
 * hubiera sacado plata del negocio para gastos personales. La diferencia
 * entre ambas es el numero que sostiene el objetivo especifico 4.
 */
export const resultadoPeriodo = (registros = []) => {
  const suma = (filtro) =>
    redondear(registros.filter(filtro).reduce((a, r) => a + num(r.monto), 0));

  const ingresos = suma((r) => r.tipo === 'INGRESO');
  const egresos = suma((r) => r.tipo === 'EGRESO');
  const retiros = suma((r) => r.tipo === 'RETIRO');
  const mezclaPersonal = suma((r) => r.origen === 'PERSONAL' && r.tipo !== 'INGRESO');

  const gananciaReal = redondear(ingresos - egresos - retiros);

  return {
    ingresos,
    egresos,
    retiros,
    mezclaPersonal,
    gananciaReal,
    gananciaSinMezcla: redondear(gananciaReal + mezclaPersonal),
    relacionCostoIngreso: relacionCostoIngreso(egresos + retiros, ingresos),
  };
};

export const _internos = { num, redondear };
