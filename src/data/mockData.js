// ============================================================
// MOCK DATA v2.0
// Plataforma de Gestión Financiera para la Rentabilidad
// Microempresas de Confección · Distrito 6, El Alto
// ============================================================

export const USUARIO = {
  nombre: 'María Mamani',
  rol: 'Productora',
  taller: 'Taller Mamani',
  distrito: 'Distrito 6 · El Alto',
  online: true, // simula estado de conexión
};

// ── KPIs del dashboard ──────────────────────────────────────
export const KPIS = [
  { label: 'Ingresos del mes',    value: 'Bs. 4,820', change: '+8.2%',   up: true  },
  { label: 'Egresos del mes',     value: 'Bs. 3,105', change: '+3.1%',   up: false },
  { label: 'Ganancia real',       value: 'Bs. 1,715', change: '+18.4%',  up: true  },
  { label: 'Gastos mezclados',    value: 'Bs. 320',   change: '⚠ Atención', up: false },
];

// ── Ventas semanales ─────────────────────────────────────────
export const VENTAS_SEMANA = [
  { dia: 'Lun', ingreso: 480,  egreso: 310 },
  { dia: 'Mar', ingreso: 720,  egreso: 420 },
  { dia: 'Mié', ingreso: 390,  egreso: 280 },
  { dia: 'Jue', ingreso: 850,  egreso: 490 },
  { dia: 'Vie', ingreso: 940,  egreso: 560 },
  { dia: 'Sáb', ingreso: 1100, egreso: 620 },
  { dia: 'Dom', ingreso: 340,  egreso: 200 },
];

// ── Registros de ingresos y egresos ─────────────────────────
// Refleja la realidad: mezcla de gastos personales/negocio
export const REGISTROS = [
  { id: 1,  fecha: '02/06/2026', tipo: 'ingreso', categoria: 'Venta prendas',       descripcion: 'Venta 3 poleras negras talla M',          monto: 195,  origen: 'negocio'   },
  { id: 2,  fecha: '02/06/2026', tipo: 'egreso',  categoria: 'Materia prima',        descripcion: 'Compra 5m tela algodón peinado',           monto: 142,  origen: 'negocio'   },
  { id: 3,  fecha: '02/06/2026', tipo: 'egreso',  categoria: 'Gasto personal',       descripcion: 'Mercado familiar (mezclado del negocio)',   monto: 85,   origen: 'personal'  },
  { id: 4,  fecha: '01/06/2026', tipo: 'ingreso', categoria: 'Venta prendas',        descripcion: 'Pedido corporativo 10 polos',              monto: 750,  origen: 'negocio'   },
  { id: 5,  fecha: '01/06/2026', tipo: 'egreso',  categoria: 'Servicios',            descripcion: 'Factura luz del taller - mayo',            monto: 68,   origen: 'negocio'   },
  { id: 6,  fecha: '01/06/2026', tipo: 'egreso',  categoria: 'Gasto personal',       descripcion: 'Transporte escolar hijo (caja del negocio)',monto: 40,   origen: 'personal'  },
  { id: 7,  fecha: '31/05/2026', tipo: 'ingreso', categoria: 'Venta prendas',        descripcion: 'Venta 2 chamarras modelo andes',           monto: 440,  origen: 'negocio'   },
  { id: 8,  fecha: '31/05/2026', tipo: 'egreso',  categoria: 'Mano de obra',         descripcion: 'Pago ayudante costura - semana',           monto: 200,  origen: 'negocio'   },
  { id: 9,  fecha: '30/05/2026', tipo: 'egreso',  categoria: 'Materia prima',        descripcion: 'Hilos, botones y cierres varios',          monto: 95,   origen: 'negocio'   },
  { id: 10, fecha: '30/05/2026', tipo: 'ingreso', categoria: 'Venta prendas',        descripcion: 'Venta 5 poleras manga larga',              monto: 425,  origen: 'negocio'   },
];

// ── Materiales e insumos ─────────────────────────────────────
export const MATERIALES = [
  { codigo: 'TLA-001', nombre: 'Algodón peinado 30/1', cat: 'Tela',   unidad: 'metro',  precio: 28.50, stock: 145, min: 50,  estado: 'ok'      },
  { codigo: 'TLA-002', nombre: 'Polialgodón Piqué',    cat: 'Tela',   unidad: 'metro',  precio: 22.00, stock: 38,  min: 50,  estado: 'bajo'    },
  { codigo: 'TLA-003', nombre: 'Polar antipilling',    cat: 'Tela',   unidad: 'metro',  precio: 35.00, stock: 62,  min: 30,  estado: 'ok'      },
  { codigo: 'HIL-001', nombre: 'Hilo poliéster Coats', cat: 'Hilo',   unidad: 'cono',   precio: 12.00, stock: 87,  min: 30,  estado: 'ok'      },
  { codigo: 'HIL-002', nombre: 'Hilo elástico blanco', cat: 'Hilo',   unidad: 'rollo',  precio: 8.50,  stock: 14,  min: 20,  estado: 'critico' },
  { codigo: 'ETQ-001', nombre: 'Etiqueta tejida marca',cat: 'Insumo', unidad: 'unidad', precio: 0.85,  stock: 1240,min: 500, estado: 'ok'      },
  { codigo: 'BTN-003', nombre: 'Botón metal 18mm',     cat: 'Insumo', unidad: 'unidad', precio: 1.20,  stock: 22,  min: 100, estado: 'critico' },
  { codigo: 'CRR-001', nombre: 'Cierre YKK 60cm',      cat: 'Insumo', unidad: 'unidad', precio: 8.50,  stock: 67,  min: 40,  estado: 'ok'      },
];

// ── BOM / Receta de producción ───────────────────────────────
// Polera Clásica — ejemplo central del costeo
export const RECETA_POLERA = [
  { material: 'Algodón peinado 30/1', cantidad: 1.4, unidad: 'm',    costo: 28.50, subtotal: 39.90 },
  { material: 'Hilo poliéster Coats', cantidad: 0.05,unidad: 'cono', costo: 12.00, subtotal: 0.60  },
  { material: 'Etiqueta tejida marca',cantidad: 1,   unidad: 'u',    costo: 0.85,  subtotal: 0.85  },
];
export const MANO_OBRA   = 8.50;  // Bs. por prenda
export const CIF_UNITARIO = 3.20; // Costos indirectos prorrateados (luz, agua, alquiler)

// ── Catálogo de productos ────────────────────────────────────
export const CATALOGO = [
  { id: 1, nombre: 'Polera Clásica Urbana',   precio: 65,  emoji: '👕', categoria: 'Poleras',    descripcion: 'Algodón peinado, varios colores' },
  { id: 2, nombre: 'Buzo con Capucha',        precio: 145, emoji: '🧥', categoria: 'Buzos',      descripcion: 'Polar antipilling, interior suave' },
  { id: 3, nombre: 'Chamarra Modelo Andes',   precio: 220, emoji: '🧥', categoria: 'Chamarras',  descripcion: 'Cierre YKK, ideal para el frío alteño' },
  { id: 4, nombre: 'Polera Manga Larga',      precio: 85,  emoji: '👕', categoria: 'Poleras',    descripcion: 'Algodón peinado reforzado en codos' },
  { id: 5, nombre: 'Polo Deportivo',          precio: 75,  emoji: '👕', categoria: 'Deportivo',  descripcion: 'Polialgodón piqué, transpirable' },
  { id: 6, nombre: 'Casaca Bomber',           precio: 180, emoji: '🧥', categoria: 'Chamarras',  descripcion: 'Elástico en puños y cintura' },
];

// ── Recomendaciones IA ───────────────────────────────────────
// Lenguaje simple, adaptado al perfil del usuario (no técnico)
export const RECOMENDACIONES_IA = [
  {
    tipo: 'oportunidad',
    titulo: 'Producí más Polera Negra Talla M',
    desc: 'Vendiste 18 unidades en 7 días y solo te quedan 4. Si no producís más esta semana, vas a perder ventas. El sistema recomienda hacer 25 unidades.',
    accion: 'Registrar orden de producción',
    urgencia: 'alta',
  },
  {
    tipo: 'precio',
    titulo: 'Tu Chamarra Andes está muy barata',
    desc: 'Te cuesta Bs. 168 hacerla y la vendés a Bs. 220. Tu ganancia real es solo Bs. 52 (23%). Otros talleres de El Alto la venden entre Bs. 240 y Bs. 260. Podés subir el precio.',
    accion: 'Ver simulación de precio',
    urgencia: 'media',
  },
  {
    tipo: 'alerta',
    titulo: 'El Polo Deportivo Azul no se vende',
    desc: 'Hace 47 días que no vendés ninguno. Tenés 23 unidades guardadas que representan Bs. 1,840 de tu dinero inmovilizado. Hacé una promoción o bajá el precio temporalmente.',
    accion: 'Crear promoción',
    urgencia: 'alta',
  },
  {
    tipo: 'forecast',
    titulo: 'Se viene el invierno: producí chamarras ahora',
    desc: 'Cada año en junio-julio tus ventas de chamarras suben 3 veces. Si empezás a producir ahora, vas a tener stock cuando más se necesita. El año pasado te quedaste sin stock en julio.',
    accion: 'Ver pronóstico de demanda',
    urgencia: 'media',
  },
];

// ── Personalizador ───────────────────────────────────────────
export const COLORES_TELA = [
  { nombre: 'Negro',       hex: '#1a1a1a' },
  { nombre: 'Blanco',      hex: '#f5f5f0' },
  { nombre: 'Tierra',      hex: '#8b4513' },
  { nombre: 'Oliva',       hex: '#556b2f' },
  { nombre: 'Vino',        hex: '#722f37' },
  { nombre: 'Mostaza',     hex: '#d4a017' },
  { nombre: 'Azul Profundo',hex: '#1e3a5f'},
  { nombre: 'Crema',       hex: '#e8dcc4' },
];

export const TALLAS_MEDIDAS = {
  S:  { pecho: 50, largo: 68, manga: 20, hombro: 44 },
  M:  { pecho: 53, largo: 70, manga: 21, hombro: 46 },
  L:  { pecho: 56, largo: 72, manga: 22, hombro: 48 },
  XL: { pecho: 59, largo: 74, manga: 23, hombro: 50 },
};
