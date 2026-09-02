// ============================================================
// REGLAS DE VALIDACION COMPARTIDAS
// El cliente valida para dar feedback inmediato; el servidor
// vuelve a validar porque nunca confia en el cliente. Misma regla
// en los dos lados para que el mensaje sea el mismo.
// ============================================================

export const MONTO_MAXIMO = 1_000_000;

export const esFechaValida = (v) => {
  if (!v) return false;
  const f = new Date(`${v}T00:00:00`);
  return !Number.isNaN(f.getTime());
};

export const esFechaFutura = (v) => {
  if (!esFechaValida(v)) return false;
  const f = new Date(`${v}T00:00:00`);
  const hoy = new Date();
  hoy.setHours(23, 59, 59, 999);
  return f > hoy;
};

/**
 * Valida un movimiento financiero. Los mensajes estan escritos para
 * el microempresario, no para el desarrollador: dicen que pasa y
 * como arreglarlo, sin jerga.
 */
export const validarRegistro = (form = {}) => {
  const errores = {};

  if (!form.descripcion?.trim()) {
    errores.descripcion = 'Escribi que fue este movimiento';
  } else if (form.descripcion.trim().length > 200) {
    errores.descripcion = 'La descripcion es muy larga, resumila un poco';
  }

  const monto = Number(form.monto);
  if (!form.monto && form.monto !== 0) errores.monto = 'Falta el monto';
  else if (!Number.isFinite(monto)) errores.monto = 'El monto tiene que ser un numero';
  else if (monto <= 0) errores.monto = 'El monto tiene que ser mayor a 0';
  else if (monto > MONTO_MAXIMO) errores.monto = 'Ese monto parece demasiado alto, revisalo';

  if (!form.fecha) errores.fecha = 'Elegi una fecha';
  else if (!esFechaValida(form.fecha)) errores.fecha = 'Esa fecha no es valida';
  else if (esFechaFutura(form.fecha)) errores.fecha = 'No se puede registrar algo que todavia no paso';

  if (!form.categoriaId) errores.categoriaId = 'Elegi una categoria';

  // Si carga prenda y cantidad, el precio deberia cuadrar con el monto.
  if (form.cantidad && form.precioUnitario) {
    const calculado = Number(form.cantidad) * Number(form.precioUnitario);
    if (Number.isFinite(calculado) && Math.abs(calculado - monto) > 0.5) {
      errores.monto = `Cantidad por precio da ${calculado.toFixed(2)}, no ${monto.toFixed(2)}`;
    }
  }

  return { errores, valido: Object.keys(errores).length === 0 };
};

/**
 * Detecta un posible duplicado: mismo monto, misma fecha y descripcion
 * parecida. No bloquea, avisa — el microempresario puede vender lo mismo
 * dos veces en un dia y eso es legitimo.
 */
export const posibleDuplicado = (nuevo, existentes = []) =>
  existentes.find(
    (r) =>
      r.fecha === nuevo.fecha &&
      Math.abs(Number(r.monto) - Number(nuevo.monto)) < 0.01 &&
      r.descripcion?.trim().toLowerCase() === nuevo.descripcion?.trim().toLowerCase()
  ) ?? null;

export const validarMaterial = (form = {}) => {
  const errores = {};
  if (!form.codigo?.trim()) errores.codigo = 'Falta el codigo';
  if (!form.nombre?.trim()) errores.nombre = 'Falta el nombre del material';
  if (!form.unidad) errores.unidad = 'Elegi la unidad de medida';

  const precio = Number(form.precioUnitario);
  if (!Number.isFinite(precio) || precio < 0) errores.precioUnitario = 'El precio no puede ser negativo';

  const stock = Number(form.stock);
  if (!Number.isFinite(stock) || stock < 0) errores.stock = 'El stock no puede ser negativo';

  const min = Number(form.stockMinimo);
  if (!Number.isFinite(min) || min < 0) errores.stockMinimo = 'El minimo no puede ser negativo';

  return { errores, valido: Object.keys(errores).length === 0 };
};

/** Estado de stock derivado, nunca escrito a mano por el usuario. */
export const estadoStock = (stock, minimo) => {
  const s = Number(stock) || 0;
  const m = Number(minimo) || 0;
  if (m > 0 && s <= m * 0.5) return 'critico';
  if (m > 0 && s <= m) return 'bajo';
  return 'ok';
};
