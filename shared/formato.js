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

/** Date | "2026-06-02" -> "02/06/2026" (como lo escribe el cuaderno) */
export const fechaCorta = (d) => {
  const f = d instanceof Date ? d : new Date(`${d}T00:00:00`);
  if (Number.isNaN(f.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(f.getDate())}/${p(f.getMonth() + 1)}/${f.getFullYear()}`;
};

/** Date | string -> "2026-06-02" para enviar a la API */
export const fechaISO = (d) => {
  const f = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(f.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${f.getFullYear()}-${p(f.getMonth() + 1)}-${p(f.getDate())}`;
};

/** "2026-06" -> "junio 2026" */
export const nombrePeriodo = (periodo) => {
  const [a, m] = String(periodo).split('-').map(Number);
  const meses = ['enero','febrero','marzo','abril','mayo','junio',
                 'julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return `${meses[(m || 1) - 1]} ${a}`;
};

export const pct = (n, decimales = 1) => `${Number(n ?? 0).toFixed(decimales)} %`;
