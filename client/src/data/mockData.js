// ============================================================
// DATOS PENDIENTES DE CONECTAR
//
// Este archivo se está vaciando a propósito. Todo lo que estaba
// acá (usuarios, materiales, productos, registros, KPIs) ahora
// viene del servidor.
//
// Lo que queda son las tres islas que todavía no tienen backend,
// cada una con el sprint en que se conecta. Mientras estén acá,
// la pantalla que las use tiene que decir que son datos de
// ejemplo: el sistema no puede afirmar nada que no pueda respaldar
// con filas de la base.
//
// PENDIENTE Sprint 4 → VENTAS_SEMANA
// PENDIENTE Sprint 5 → RECOMENDACIONES_IA
// PENDIENTE Sprint 6 → CATALOGO
//
// COLORES_TELA y TALLAS_MEDIDAS no son datos de ejemplo: son
// opciones fijas del personalizador y se quedan.
// ============================================================

// ── PENDIENTE Sprint 4 ───────────────────────────────────────
// El panel ya calcula sus indicadores desde la base; este gráfico
// no. Se reemplaza por la serie real de ventas por día.
export const VENTAS_SEMANA = [
  { dia: 'Lun', ingreso: 480,  egreso: 310 },
  { dia: 'Mar', ingreso: 720,  egreso: 420 },
  { dia: 'Mié', ingreso: 390,  egreso: 280 },
  { dia: 'Jue', ingreso: 850,  egreso: 490 },
  { dia: 'Vie', ingreso: 940,  egreso: 560 },
  { dia: 'Sáb', ingreso: 1100, egreso: 620 },
  { dia: 'Dom', ingreso: 340,  egreso: 200 },
];

// ── PENDIENTE Sprint 5 ───────────────────────────────────────
// Texto fijo. El motor real calcula estas recomendaciones sobre
// los datos del taller y guarda las cifras que las originaron.
export const RECOMENDACIONES_IA = [
  {
    tipo: 'oportunidad',
    titulo: 'Producí más Polera Negra Talla M',
    desc: 'Vendiste 18 unidades en 7 días y solo te quedan 4. Si no producís más esta semana, vas a perder ventas.',
    accion: 'Registrar orden de producción',
    urgencia: 'alta',
  },
  {
    tipo: 'precio',
    titulo: 'Tu Chamarra Andes está muy barata',
    desc: 'Te cuesta Bs. 168 hacerla y la vendés a Bs. 220. Tu ganancia real es solo Bs. 52 (23 %).',
    accion: 'Ver simulación de precio',
    urgencia: 'media',
  },
  {
    tipo: 'alerta',
    titulo: 'El Polo Deportivo Azul no se vende',
    desc: 'Hace 47 días que no vendés ninguno. Tenés 23 unidades guardadas que representan Bs. 1.840 inmovilizados.',
    accion: 'Crear promoción',
    urgencia: 'alta',
  },
  {
    tipo: 'forecast',
    titulo: 'Se viene el invierno: producí chamarras ahora',
    desc: 'Cada año en junio y julio tus ventas de chamarras suben tres veces.',
    accion: 'Ver pronóstico de demanda',
    urgencia: 'media',
  },
];

// ── PENDIENTE Sprint 6 ───────────────────────────────────────
// La tienda pasa a leer los productos marcados como publicados.
export const CATALOGO = [
  { id: 1, nombre: 'Polera Clásica Urbana', precio: 65,  emoji: '👕', categoria: 'Poleras',   descripcion: 'Algodón peinado, varios colores' },
  { id: 2, nombre: 'Buzo con Capucha',      precio: 145, emoji: '🧥', categoria: 'Buzos',     descripcion: 'Polar antipilling, interior suave' },
  { id: 3, nombre: 'Chamarra Modelo Andes', precio: 220, emoji: '🧥', categoria: 'Chamarras', descripcion: 'Cierre YKK, ideal para el frío alteño' },
  { id: 4, nombre: 'Polera Manga Larga',    precio: 85,  emoji: '👕', categoria: 'Poleras',   descripcion: 'Algodón peinado reforzado en codos' },
  { id: 5, nombre: 'Polo Deportivo',        precio: 75,  emoji: '👕', categoria: 'Deportivo', descripcion: 'Polialgodón piqué, transpirable' },
  { id: 6, nombre: 'Casaca Bomber',         precio: 180, emoji: '🧥', categoria: 'Chamarras', descripcion: 'Elástico en puños y cintura' },
];

// ── Opciones del personalizador (no son datos de ejemplo) ────

export const COLORES_TELA = [
  { nombre: 'Negro',         hex: '#1a1a1a' },
  { nombre: 'Blanco',        hex: '#f5f5f0' },
  { nombre: 'Tierra',        hex: '#8b4513' },
  { nombre: 'Oliva',         hex: '#556b2f' },
  { nombre: 'Vino',          hex: '#722f37' },
  { nombre: 'Mostaza',       hex: '#d4a017' },
  { nombre: 'Azul Profundo', hex: '#1e3a5f' },
  { nombre: 'Crema',         hex: '#e8dcc4' },
];

export const TALLAS_MEDIDAS = {
  S:  { pecho: 50, largo: 68, manga: 20, hombro: 44 },
  M:  { pecho: 53, largo: 70, manga: 21, hombro: 46 },
  L:  { pecho: 56, largo: 72, manga: 22, hombro: 48 },
  XL: { pecho: 59, largo: 74, manga: 23, hombro: 50 },
};
