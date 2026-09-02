// ============================================================
// COMPONENTES COMPARTIDOS v2.2
// Sidebar (con separación real de roles) + TopBar
// ============================================================

import React from 'react';
import { ChevronRight, Search, Bell, Wifi, WifiOff } from 'lucide-react';
import { ROLES, GRUPOS, itemsPorRol } from '../data/navigation';

// ── Sidebar ──────────────────────────────────────────────────
export const Sidebar = ({ vista, setVista, usuario, rol, setRol }) => {
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
            <div className="font-black text-sm leading-tight tracking-tight truncate">GESTIÓN FINANCIERA</div>
            <div className="text-[10px] text-stone-500 tracking-[0.15em] uppercase mt-0.5">Confección · El Alto</div>
          </div>
        </div>
      </div>

      {/* Switch de rol — simula dos accesos separados (productor / cliente).
          En el sistema real esto sería dos logins distintos, no un botón. */}
      <div className="px-4 pt-4">
        <div className="text-[9px] font-bold tracking-[0.25em] uppercase text-stone-600 mb-1.5">
          Vista activa
        </div>
        <div className="grid grid-cols-2 gap-1 bg-stone-900 rounded-sm p-1">
          {Object.values(ROLES).map(r => (
            <button
              key={r.id}
              onClick={() => setRol(r.id)}
              className={`py-2 rounded-sm text-xs font-bold transition-colors ${
                rol === r.id
                  ? 'bg-orange-500 text-stone-950'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="text-[10px] text-stone-600 mt-1.5 leading-snug">
          {ROLES[rol].descripcion}
        </div>
      </div>

      {/* Indicador online/offline — solo aplica al lado productor */}
      {rol === 'productor' && (
        <div className={`mx-4 mt-3 px-3 py-1.5 rounded-sm flex items-center gap-2 text-[10px] font-bold tracking-wider ${
          usuario.online
            ? 'bg-green-950 text-green-400 border border-green-800'
            : 'bg-red-950 text-red-400 border border-red-800'
        }`}>
          {usuario.online
            ? <><Wifi size={10} /> EN LÍNEA</>
            : <><WifiOff size={10} /> SIN CONEXIÓN · MODO LOCAL</>
          }
        </div>
      )}

      {/* Navegación agrupada — solo ítems del rol activo */}
      <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
        {GRUPOS.map(grupo => {
          const itemsGrupo = items.filter(i => i.grupo === grupo.key);
          if (itemsGrupo.length === 0) return null;
          return (
            <div key={grupo.key}>
              <div className="text-[9px] font-bold tracking-[0.25em] uppercase text-stone-600 px-3 mb-1">
                {grupo.label}
              </div>
              <div className="space-y-0.5">
                {itemsGrupo.map(item => {
                  const Icon = item.icon;
                  const active = vista === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setVista(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-all ${
                        active
                          ? 'bg-orange-500 text-stone-950'
                          : 'text-stone-400 hover:bg-stone-900 hover:text-stone-100'
                      }`}
                    >
                      <Icon size={15} strokeWidth={2.5} />
                      <span className="flex-1 text-left text-xs">{item.label}</span>
                      {active && <ChevronRight size={12} className="shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Usuario — cambia según el rol activo */}
      <div className="p-4 border-t border-stone-800">
        <div className="bg-stone-900 rounded-sm p-3">
          <div className="text-[10px] text-stone-500 uppercase tracking-wider mb-1">
            {rol === 'productor' ? 'Sesión activa' : 'Comprando como'}
          </div>
          <div className="text-sm font-bold truncate">{usuario.nombre}</div>
          <div className="text-xs text-stone-400 truncate">{usuario.distrito}</div>
        </div>
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
    <div className="flex items-center gap-3">
      {acciones && acciones}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          placeholder="Buscar..."
          className="pl-9 pr-4 py-2 bg-stone-100 border border-stone-200 rounded-sm text-sm w-56 focus:outline-none focus:border-orange-500"
        />
      </div>
      <button className="p-2 hover:bg-stone-100 rounded-sm relative">
        <Bell size={17} />
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
      </button>
    </div>
  </div>
);
