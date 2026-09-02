// ============================================================
// COMPONENTES COMPARTIDOS v3.0
// Sidebar + TopBar
//
// v3: el rol ya no se cambia con un botón — viene de la cuenta con
// la que entraste, como en un sistema real. Y se fue el indicador
// de conexión, que estaba fijo en "en línea" y podía mostrar
// "SIN CONEXIÓN" siendo mentira. Vuelve en el Sprint 7, conectado
// de verdad al estado de la red.
// ============================================================

import React from 'react';
import { ChevronRight, Search, LogOut } from 'lucide-react';
import { GRUPOS, itemsPorRol } from '../data/navigation';

const ETIQUETA_ROL = {
  PRODUCTOR: 'Dueño del taller',
  AYUDANTE: 'Ayudante',
  ADMIN: 'Equipo investigador',
  CLIENTE: 'Comprando como',
};

// ── Sidebar ──────────────────────────────────────────────────
export const Sidebar = ({ vista, setVista, usuario, rol, onSalir }) => {
  const items = itemsPorRol(rol);

  return (
    <aside className="w-64 bg-stone-950 text-stone-100 flex flex-col border-r border-stone-800 shrink-0">
      {/* Logo */}
      <div className="p-6 border-b border-stone-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-sm flex items-center justify-center font-black text-stone-950 text-lg shrink-0">
            G
          </div>
          <div className="min-w-0">
            <div className="font-black text-sm leading-tight tracking-tight truncate">
              GESTIÓN FINANCIERA
            </div>
            <div className="text-[10px] text-stone-500 tracking-[0.15em] uppercase mt-0.5">
              Confección · El Alto
            </div>
          </div>
        </div>
      </div>

      {/* Aviso para el ayudante: qué puede y qué no */}
      {usuario?.rol === 'AYUDANTE' && (
        <div className="mx-4 mt-4 px-3 py-2 rounded-sm bg-stone-900 border border-stone-800">
          <div className="text-[10px] font-bold tracking-wider uppercase text-orange-400 mb-0.5">
            Modo ayudante
          </div>
          <div className="text-[11px] text-stone-400 leading-snug">
            Podés registrar ventas y gastos. Los costos y márgenes los ve el dueño.
          </div>
        </div>
      )}

      {/* Navegación agrupada */}
      <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
        {GRUPOS.map((grupo) => {
          const itemsGrupo = items.filter((i) => i.grupo === grupo.key);
          if (itemsGrupo.length === 0) return null;
          return (
            <div key={grupo.key}>
              <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-stone-600 px-3 mb-1">
                {grupo.label}
              </div>
              <div className="space-y-0.5">
                {itemsGrupo.map((item) => {
                  const Icon = item.icon;
                  const active = vista === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setVista(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm font-medium transition-all ${
                        active
                          ? 'bg-orange-500 text-stone-950'
                          : 'text-stone-400 hover:bg-stone-900 hover:text-stone-100'
                      }`}
                    >
                      <Icon size={16} strokeWidth={2.5} />
                      <span className="flex-1 text-left text-[13px]">{item.label}</span>
                      {active && <ChevronRight size={12} className="shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Usuario y salida */}
      <div className="p-4 border-t border-stone-800 space-y-2">
        <div className="bg-stone-900 rounded-sm p-3">
          <div className="text-[10px] text-stone-500 uppercase tracking-wider mb-1">
            {ETIQUETA_ROL[usuario?.rol] ?? 'Sesión activa'}
          </div>
          <div className="text-sm font-bold truncate">{usuario?.nombre}</div>
          <div className="text-xs text-stone-400 truncate">{usuario?.email}</div>
        </div>
        <button
          onClick={onSalir}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-sm text-xs font-bold text-stone-400 hover:bg-stone-900 hover:text-stone-100 transition-colors"
        >
          <LogOut size={13} /> SALIR
        </button>
      </div>
    </aside>
  );
};

// ── TopBar ───────────────────────────────────────────────────
export const TopBar = ({ titulo, subtitulo, acciones }) => (
  <div className="border-b border-stone-200 bg-white px-8 py-5 flex items-center justify-between shrink-0">
    <div>
      <div className="text-[10px] tracking-[0.25em] uppercase text-stone-500 mb-1">{subtitulo}</div>
      <h1 className="text-2xl font-black text-stone-900 tracking-tight">{titulo}</h1>
    </div>
    <div className="flex items-center gap-3">{acciones}</div>
  </div>
);

// ── Estados compartidos ──────────────────────────────────────

export const Cargando = ({ texto = 'Cargando...' }) => (
  <div className="p-8 text-center text-stone-500 text-sm">{texto}</div>
);

export const ErrorCarga = ({ mensaje, onReintentar }) => (
  <div className="m-8 bg-red-50 border-2 border-red-200 rounded-sm p-5">
    <div className="font-bold text-red-900 mb-1">No se pudieron cargar los datos</div>
    <div className="text-sm text-red-800 mb-3">{mensaje}</div>
    {onReintentar && (
      <button
        onClick={onReintentar}
        className="bg-red-700 text-white px-4 py-2 rounded-sm text-xs font-black hover:bg-red-800"
      >
        REINTENTAR
      </button>
    )}
  </div>
);

export const SinDatos = ({ titulo, texto, accion }) => (
  <div className="p-12 text-center">
    <div className="text-base font-bold text-stone-700 mb-1">{titulo}</div>
    <div className="text-sm text-stone-500 max-w-sm mx-auto">{texto}</div>
    {accion && <div className="mt-4">{accion}</div>}
  </div>
);
