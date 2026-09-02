// ============================================================
// NAVEGACIÓN Y ROLES v2.2
// Fuente única de verdad para el menú: Sidebar y App.jsx leen
// de acá, así no hay dos listas desincronizadas.
//
// En el sistema real esto no sería un switch visual: serían dos
// logins distintos (productor vs cliente) con permisos separados
// en el backend. Acá simulamos ambas experiencias en un mismo
// beta para poder mostrar las dos sin necesitar autenticación.
// ============================================================

import {
  Activity, Layers, Target, Sparkles, FileBarChart2,
  ShoppingBag, Zap, BookOpen, ClipboardList,
} from 'lucide-react';

export const ROLES = {
  productor: { id: 'productor', label: 'Productor', descripcion: 'Gestión del taller' },
  cliente:   { id: 'cliente',   label: 'Cliente',    descripcion: 'Tienda y personalización' },
};

// Cada item declara a qué rol(es) pertenece. Un item sin cruce de
// roles = separación real, no solo visual.
export const NAV_ITEMS = [
  { id: 'dashboard',    label: 'Panel general',     icon: Activity,      grupo: 'principal',     rol: 'productor', titulo: 'Panel general',        subtitulo: 'Resumen ejecutivo'          },
  { id: 'registros',    label: 'Ingresos/Egresos',  icon: BookOpen,      grupo: 'principal',     rol: 'productor', titulo: 'Ingresos y Egresos',    subtitulo: 'Registro financiero diario' },
  { id: 'materiales',   label: 'Materiales',        icon: Layers,        grupo: 'produccion',    rol: 'productor', titulo: 'Materiales e insumos',  subtitulo: 'Inventario de producción'   },
  { id: 'ordenes',      label: 'Órdenes',           icon: ClipboardList, grupo: 'produccion',    rol: 'productor', titulo: 'Órdenes de producción', subtitulo: 'Qué se está haciendo'       },
  { id: 'costeo',       label: 'Costeo',            icon: Target,        grupo: 'produccion',    rol: 'productor', titulo: 'Costeo de producción',  subtitulo: 'Cálculo de costos'          },
  { id: 'reportes',     label: 'Reportes',          icon: FileBarChart2, grupo: 'contabilidad',  rol: 'productor', titulo: 'Reportes contables',    subtitulo: 'Plantillas de Contaduría'   },
  { id: 'ia',           label: 'Recomendaciones',   icon: Sparkles,      grupo: 'inteligencia',  rol: 'productor', titulo: 'Recomendaciones',       subtitulo: 'Análisis de tus datos'      },
  { id: 'catalogo',     label: 'Catálogo',          icon: ShoppingBag,   grupo: 'tienda',        rol: 'cliente',   titulo: 'Catálogo público',      subtitulo: 'Tienda online'              },
  { id: 'personalizar', label: 'Personalizar',      icon: Zap,           grupo: 'tienda',        rol: 'cliente',   titulo: 'Personalizador',        subtitulo: 'Editor 2D'                  },
];

export const GRUPOS = [
  { key: 'principal',    label: 'Principal'    },
  { key: 'produccion',   label: 'Producción'   },
  { key: 'contabilidad', label: 'Contabilidad' },
  { key: 'inteligencia', label: 'Inteligencia' },
  { key: 'tienda',       label: 'Tienda'       },
];

export const itemsPorRol = (rol) => NAV_ITEMS.filter(i => i.rol === rol);

// Vista de entrada por defecto al cambiar de rol
export const vistaInicial = (rol) => (rol === 'productor' ? 'dashboard' : 'catalogo');
