// ============================================================
// DIBUJOS DE PRENDAS PARA EL EDITOR 2D
//
// Antes el editor dibujaba SIEMPRE una polera, sin importar si
// elegías chamarra o polo. Eso no tenía sentido: el cliente
// personalizaba una prenda y veía otra.
//
// Cada prenda tiene frente y espalda, y sus zonas de estampado
// declaradas. Las zonas están en porcentaje del lienzo, no en
// píxeles, para que el dibujo escale con la pantalla.
//
// Se eligió SVG y no 3D a propósito. Un visor 3D suma entre 3 y
// 6 MB de descarga, y todo el diseño de este sistema parte de que
// la conexión del Distrito 6 es intermitente y se paga por datos
// móviles. Gastar el paquete de datos de la usuaria en una
// animación contradice el objetivo de que administre mejor su plata.
// ============================================================

// Zonas donde se puede estampar. x, y y ancho van en porcentaje.
const ZONAS = {
  pecho:       { id: 'pecho',       nombre: 'Pecho',           x: 50, y: 42, ancho: 30, vista: 'frente' },
  pechoIzq:    { id: 'pechoIzq',    nombre: 'Pecho izquierdo', x: 36, y: 34, ancho: 13, vista: 'frente' },
  espalda:     { id: 'espalda',     nombre: 'Espalda',         x: 50, y: 40, ancho: 34, vista: 'espalda' },
  espaldaAlta: { id: 'espaldaAlta', nombre: 'Espalda alta',    x: 50, y: 26, ancho: 24, vista: 'espalda' },
  mangaIzq:    { id: 'mangaIzq',    nombre: 'Manga izquierda', x: 14, y: 32, ancho: 11, vista: 'ambas' },
  mangaDer:    { id: 'mangaDer',    nombre: 'Manga derecha',   x: 86, y: 32, ancho: 11, vista: 'ambas' },
};

// Silueta base compartida: cuerpo con mangas cortas.
const CUERPO_CORTO =
  'M 100 80 L 60 100 L 30 180 L 70 200 L 80 190 L 80 420 L 320 420 L 320 190 L 330 200 L 370 180 L 340 100 L 300 80 L 260 70 Q 230 110 200 110 Q 170 110 140 70 Z';

// Cuerpo con mangas largas, para chamarra y buzo.
const CUERPO_LARGO =
  'M 100 80 L 55 105 L 20 300 L 65 315 L 80 240 L 80 425 L 320 425 L 320 240 L 335 315 L 380 300 L 345 105 L 300 80 L 260 70 Q 230 110 200 110 Q 170 110 140 70 Z';

const CUELLO_REDONDO =
  'M 140 70 Q 170 110 200 110 Q 230 110 260 70 Q 230 93 200 93 Q 170 93 140 70 Z';

const PLIEGUES_CORTO = [
  'M 80 200 Q 82 310 82 420',
  'M 318 200 Q 316 310 316 420',
];
const PLIEGUES_LARGO = [
  'M 80 250 Q 82 340 82 425',
  'M 318 250 Q 316 340 316 425',
];

/**
 * Cada prenda declara:
 *   frente / espalda  — trazos que se dibujan, en orden
 *   zonas             — dónde se puede poner el estampado
 *
 * `tipo` de cada trazo:
 *   cuerpo   se pinta del color de la tela
 *   detalle  línea fina, para pliegues y costuras
 *   accesorio se pinta de un color propio (cierre, botones)
 */
export const PRENDAS = {
  polera: {
    id: 'polera',
    nombre: 'Polera',
    coincide: ['polera', 'remera', 'camiseta'],
    frente: [
      { d: CUERPO_CORTO, tipo: 'cuerpo' },
      { d: CUELLO_REDONDO, tipo: 'cuerpo' },
      ...PLIEGUES_CORTO.map((d) => ({ d, tipo: 'detalle' })),
    ],
    espalda: [
      { d: CUERPO_CORTO, tipo: 'cuerpo' },
      // De atrás el cuello es una línea, no un escote
      { d: 'M 140 70 Q 200 96 260 70', tipo: 'detalle' },
      ...PLIEGUES_CORTO.map((d) => ({ d, tipo: 'detalle' })),
    ],
    zonas: [ZONAS.pecho, ZONAS.pechoIzq, ZONAS.espalda, ZONAS.espaldaAlta, ZONAS.mangaIzq, ZONAS.mangaDer],
  },

  polo: {
    id: 'polo',
    nombre: 'Polo',
    coincide: ['polo', 'deportivo', 'pique'],
    frente: [
      { d: CUERPO_CORTO, tipo: 'cuerpo' },
      // Cuello con solapa
      { d: 'M 140 70 Q 170 105 200 105 Q 230 105 260 70 L 268 82 Q 232 122 200 122 Q 168 122 132 82 Z', tipo: 'cuerpo', borde: true },
      // Tapeta con botones
      { d: 'M 186 105 L 186 175 L 214 175 L 214 105', tipo: 'detalle' },
      { d: 'M 200 105 L 200 175', tipo: 'detalle' },
      { cx: 200, cy: 122, r: 4, tipo: 'accesorio' },
      { cx: 200, cy: 152, r: 4, tipo: 'accesorio' },
      ...PLIEGUES_CORTO.map((d) => ({ d, tipo: 'detalle' })),
    ],
    espalda: [
      { d: CUERPO_CORTO, tipo: 'cuerpo' },
      { d: 'M 140 70 Q 200 100 260 70 L 262 84 Q 200 114 138 84 Z', tipo: 'cuerpo', borde: true },
      ...PLIEGUES_CORTO.map((d) => ({ d, tipo: 'detalle' })),
    ],
    zonas: [
      { ...ZONAS.pecho, y: 48 },
      { ...ZONAS.pechoIzq, y: 40 },
      ZONAS.espalda,
      ZONAS.mangaIzq,
      ZONAS.mangaDer,
    ],
  },

  chamarra: {
    id: 'chamarra',
    nombre: 'Chamarra',
    coincide: ['chamarra', 'campera', 'casaca', 'bomber'],
    frente: [
      { d: CUERPO_LARGO, tipo: 'cuerpo' },
      // Cuello alto
      { d: 'M 140 70 Q 170 100 200 100 Q 230 100 260 70 L 264 48 Q 200 78 136 48 Z', tipo: 'cuerpo', borde: true },
      // Cierre al medio, de arriba a abajo
      { d: 'M 200 78 L 200 425', tipo: 'accesorio', grosor: 5 },
      { d: 'M 200 78 L 200 425', tipo: 'detalle' },
      // Bolsillos
      { d: 'M 120 300 L 175 300 L 175 315 L 120 315 Z', tipo: 'detalle' },
      { d: 'M 225 300 L 280 300 L 280 315 L 225 315 Z', tipo: 'detalle' },
      // Puños y cintura elástica
      { d: 'M 22 292 L 68 306', tipo: 'detalle', grosor: 3 },
      { d: 'M 332 306 L 378 292', tipo: 'detalle', grosor: 3 },
      { d: 'M 80 405 L 320 405', tipo: 'detalle', grosor: 3 },
    ],
    espalda: [
      { d: CUERPO_LARGO, tipo: 'cuerpo' },
      { d: 'M 136 48 Q 200 82 264 48 L 262 66 Q 200 98 138 66 Z', tipo: 'cuerpo', borde: true },
      { d: 'M 80 405 L 320 405', tipo: 'detalle', grosor: 3 },
      ...PLIEGUES_LARGO.map((d) => ({ d, tipo: 'detalle' })),
    ],
    // En una chamarra con cierre no se estampa el pecho entero: el
    // cierre parte el dibujo al medio.
    zonas: [
      { ...ZONAS.pechoIzq, x: 145 / 4, y: 36 },
      { ...ZONAS.espalda, y: 38, ancho: 38 },
      { ...ZONAS.espaldaAlta, y: 24 },
      { ...ZONAS.mangaIzq, y: 42 },
      { ...ZONAS.mangaDer, y: 42 },
    ],
  },

  buzo: {
    id: 'buzo',
    nombre: 'Buzo con capucha',
    coincide: ['buzo', 'capucha', 'hoodie', 'polar'],
    frente: [
      { d: CUERPO_LARGO, tipo: 'cuerpo' },
      // Capucha
      { d: 'M 140 70 Q 145 20 200 18 Q 255 20 260 70 Q 230 96 200 96 Q 170 96 140 70 Z', tipo: 'cuerpo', borde: true },
      { d: 'M 160 62 Q 200 88 240 62', tipo: 'detalle' },
      // Cordones
      { d: 'M 185 90 L 182 130', tipo: 'detalle', grosor: 3 },
      { d: 'M 215 90 L 218 130', tipo: 'detalle', grosor: 3 },
      // Bolsillo canguro
      { d: 'M 135 300 Q 200 316 265 300 L 258 356 L 142 356 Z', tipo: 'detalle' },
      { d: 'M 80 405 L 320 405', tipo: 'detalle', grosor: 3 },
    ],
    espalda: [
      { d: CUERPO_LARGO, tipo: 'cuerpo' },
      { d: 'M 140 70 Q 145 22 200 20 Q 255 22 260 70 Q 230 90 200 90 Q 170 90 140 70 Z', tipo: 'cuerpo', borde: true },
      { d: 'M 80 405 L 320 405', tipo: 'detalle', grosor: 3 },
      ...PLIEGUES_LARGO.map((d) => ({ d, tipo: 'detalle' })),
    ],
    // El bolsillo canguro ocupa el centro bajo, así que el pecho
    // sube y la espalda es la zona grande.
    zonas: [
      { ...ZONAS.pecho, y: 38, ancho: 26 },
      { ...ZONAS.pechoIzq, y: 34 },
      { ...ZONAS.espalda, y: 38, ancho: 38 },
      { ...ZONAS.mangaIzq, y: 42 },
      { ...ZONAS.mangaDer, y: 42 },
    ],
  },
};

/**
 * Elige el dibujo segun la categoria o el nombre del producto.
 * Si no reconoce nada, cae en polera: es la prenda mas comun del
 * sector y la silueta mas neutra.
 */
export const prendaDe = (producto) => {
  const texto = `${producto?.categoria ?? ''} ${producto?.nombre ?? ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

  for (const prenda of Object.values(PRENDAS)) {
    if (prenda.coincide.some((palabra) => texto.includes(palabra))) return prenda;
  }
  return PRENDAS.polera;
};

/** Colores de tela disponibles. */
export const COLORES_TELA = [
  { nombre: 'Negro',         hex: '#1a1a1a' },
  { nombre: 'Blanco',        hex: '#f5f5f0' },
  { nombre: 'Gris',          hex: '#9ca3af' },
  { nombre: 'Tierra',        hex: '#8b4513' },
  { nombre: 'Oliva',         hex: '#556b2f' },
  { nombre: 'Vino',          hex: '#722f37' },
  { nombre: 'Mostaza',       hex: '#d4a017' },
  { nombre: 'Azul Profundo', hex: '#1e3a5f' },
  { nombre: 'Rojo',          hex: '#b91c1c' },
  { nombre: 'Crema',         hex: '#e8dcc4' },
];

export const TALLAS_MEDIDAS = {
  S:  { pecho: 50, largo: 68, manga: 20, hombro: 44 },
  M:  { pecho: 53, largo: 70, manga: 21, hombro: 46 },
  L:  { pecho: 56, largo: 72, manga: 22, hombro: 48 },
  XL: { pecho: 59, largo: 74, manga: 23, hombro: 50 },
};

/** Los colores claros necesitan un borde visible sobre fondo claro. */
export const necesitaBorde = (hex) =>
  ['#f5f5f0', '#e8dcc4', '#d4a017'].includes(hex?.toLowerCase());
