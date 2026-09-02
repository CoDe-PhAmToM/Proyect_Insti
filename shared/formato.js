// ============================================================
// FORMATO
// Presentacion de moneda, fechas y cantidades. Lo usan cliente y
// servidor para que un mismo numero se vea igual en los dos lados.
// ============================================================

export const MONEDA = 'Bs.';

/** 1234.5 -> "Bs. 1,234.50" */
export const bs = (n, { simbolo = true } = {}) => {
  const v = Number(n ?? 0);
  const s = v.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return simbolo ? `${MONEDA} ${s}` : s;
};

/**
 * Acepta lo que llegue: un Date, "2026-06-02" del formulario, o
 * "2026-06-02T00:00:00.000Z" que es como la API devuelve las fechas.
 *
 * Las fechas de negocio se guardan como DATE puro (sin hora), asi
 * que se leen en UTC. Interpretarlas en la zona local restaria
 * horas y en Bolivia (UTC-4) mostraria el dia anterior.
 */
const aFecha = (d) => {
  if (d instanceof Date) return Number.isNaN(d.getTime()) ? null : d;
  if (typeof d !== 'string' || !d) return null;
  const texto = d.includes('T') ? d : `${d}T00:00:00Z`;
  const f = new Date(texto);
  return Number.isNaN(f.getTime()) ? null : f;
};

/** -> "02/06/2026" (como lo escribe el cuaderno) */
export const fechaCorta = (d) => {
  const f = aFecha(d);
  if (!f) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(f.getUTCDate())}/${p(f.getUTCMonth() + 1)}/${f.getUTCFullYear()}`;
};

/** -> "2026-06-02" para enviar a la API o llenar un <input type="date"> */
export const fechaISO = (d) => {
  const f = aFecha(d);
  if (!f) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${f.getUTCFullYear()}-${p(f.getUTCMonth() + 1)}-${p(f.getUTCDate())}`;
};

/**
 * El dia de hoy segun el reloj del usuario, no segun UTC.
 *
 * Importa: en Bolivia (UTC-4), a las 21:00 del lunes ya es martes en
 * UTC. Si el formulario propusiera la fecha en UTC, alguien que
 * anota una venta de noche la registraria con la fecha de mañana, y
 * el servidor la rechazaria por futura.
 */
export const hoyISO = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** "2026-06" -> "junio 2026" */
export const nombrePeriodo = (periodo) => {
  const [a, m] = String(periodo).split('-').map(Number);
  const meses = ['enero','febrero','marzo','abril','mayo','junio',
                 'julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return `${meses[(m || 1) - 1]} ${a}`;
};

export const pct = (n, decimales = 1) => `${Number(n ?? 0).toFixed(decimales)} %`;
