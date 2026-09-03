// ============================================================
// COMPONENTES COMPARTIDOS v4.0
//
// v4: diseño para celular. El ítem 8 de la encuesta del equipo
// pregunta literalmente si usarían "una aplicación en su celular",
// y hasta ahora el sistema era solo de escritorio: barra lateral
// fija de 256 px y tablas de ocho columnas.
//
// En celular la barra pasa a ser un cajón que se abre con el botón
// de menú, y se cierra sola al elegir una pantalla. Los tamaños de
// letra suben: la población objetivo es adulta y muchos leen con
// dificultad, así que nada por debajo de 12 px.
// ============================================================

import React, { useEffect } from 'react';
import { ChevronRight, LogOut, Menu, X, Wifi, WifiOff, CloudOff } from 'lucide-react';
import { GRUPOS, itemsPorRol } from '../data/navigation';
import { useConexion } from '../lib/conexion';

const ETIQUETA_ROL = {
  PRODUCTOR: 'Dueño del taller',
  AYUDANTE: 'Ayudante',
  ADMIN: 'Equipo investigador',
  CLIENTE: 'Comprando como',
};

// ── Sidebar ──────────────────────────────────────────────────

export const Sidebar = ({ vista, setVista, usuario, rol, onSalir, abierto, onCerrar }) => {
  const items = itemsPorRol(rol, usuario?.rol);

  // En celular, elegir una pantalla cierra el cajón: si no, queda
  // tapando el contenido que la persona quiso ver.
  const elegir = (id) => {
    setVista(id);
    onCerrar?.();
  };

  // Escape cierra el cajón, y con el cajón abierto no se scrollea
  // el fondo.
  useEffect(() => {
    if (!abierto) return;
    const alTecla = (e) => e.key === 'Escape' && onCerrar?.();
    document.addEventListener('keydown', alTecla);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', alTecla);
      document.body.style.overflow = '';
    };
  }, [abierto, onCerrar]);

  return (
    <>
      {/* Fondo oscuro, solo en celular */}
      {abierto && (
        <div
          onClick={onCerrar}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          w-72 bg-stone-950 text-stone-100 flex flex-col border-r border-stone-800 shrink-0
          fixed inset-y-0 left-0 z-50 transition-transform duration-200
          lg:static lg:translate-x-0 lg:w-64
          ${abierto ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-5 border-b border-stone-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-sm flex items-center justify-center font-black text-stone-950 text-lg shrink-0">
              G
            </div>
            <div className="min-w-0">
              <div className="font-black text-sm leading-tight tracking-tight truncate">
                GESTIÓN FINANCIERA
              </div>
              <div className="text-[11px] text-stone-500 tracking-[0.15em] uppercase mt-0.5">
                Confección · El Alto
              </div>
            </div>
          </div>
          <button
            onClick={onCerrar}
            className="lg:hidden p-2 -mr-2 text-stone-400 hover:text-white"
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        <IndicadorConexion />

        {usuario?.rol === 'AYUDANTE' && (
          <div className="mx-4 mt-3 px-3 py-2 rounded-sm bg-stone-900 border border-stone-800">
            <div className="text-[11px] font-bold tracking-wider uppercase text-orange-400 mb-0.5">
              Modo ayudante
            </div>
            <div className="text-xs text-stone-400 leading-snug">
              Podés registrar ventas y gastos. Los costos y márgenes los ve el dueño.
            </div>
          </div>
        )}

        <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
          {GRUPOS.map((grupo) => {
            const itemsGrupo = items.filter((i) => i.grupo === grupo.key);
            if (itemsGrupo.length === 0) return null;
            return (
              <div key={grupo.key}>
                <div className="text-[11px] font-bold tracking-[0.2em] uppercase text-stone-600 px-3 mb-1.5">
                  {grupo.label}
                </div>
                <div className="space-y-0.5">
                  {itemsGrupo.map((item) => {
                    const Icon = item.icon;
                    const activo = vista === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => elegir(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-3 lg:py-2.5 rounded-sm font-medium transition-all ${
                          activo
                            ? 'bg-orange-500 text-stone-950'
                            : 'text-stone-400 hover:bg-stone-900 hover:text-stone-100'
                        }`}
                      >
                        <Icon size={17} strokeWidth={2.5} />
                        <span className="flex-1 text-left text-sm">{item.label}</span>
                        {activo && <ChevronRight size={13} className="shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-stone-800 space-y-2">
          <div className="bg-stone-900 rounded-sm p-3">
            <div className="text-[11px] text-stone-500 uppercase tracking-wider mb-1">
              {ETIQUETA_ROL[usuario?.rol] ?? 'Sesión activa'}
            </div>
            <div className="text-sm font-bold truncate">{usuario?.nombre}</div>
            <div className="text-xs text-stone-400 truncate">{usuario?.email}</div>
          </div>
          <button
            onClick={onSalir}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-sm text-xs font-bold text-stone-400 hover:bg-stone-900 hover:text-stone-100"
          >
            <LogOut size={14} /> SALIR
          </button>
        </div>
      </aside>
    </>
  );
};

// ── Indicador de conexión ────────────────────────────────────
// Antes estaba fijo en "EN LÍNEA" y podía mostrar "SIN CONEXIÓN"
// siendo mentira. Ahora sale del estado real de la red y de la
// cola de movimientos sin sincronizar.

const IndicadorConexion = () => {
  const { enLinea, pendientes, sincronizando } = useConexion();

  if (enLinea && pendientes === 0) {
    return (
      <div className="mx-4 mt-3 px-3 py-1.5 rounded-sm flex items-center gap-2 text-[11px] font-bold tracking-wider bg-green-950 text-green-400 border border-green-800">
        <Wifi size={11} /> CON INTERNET
      </div>
    );
  }

  if (!enLinea) {
    return (
      <div className="mx-4 mt-3 px-3 py-2 rounded-sm bg-amber-950 text-amber-300 border border-amber-800">
        <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider">
          <WifiOff size={11} /> SIN INTERNET
        </div>
        <div className="text-[11px] mt-1 leading-snug text-amber-200/80">
          {pendientes > 0
            ? `Guardamos ${pendientes} movimiento${pendientes !== 1 ? 's' : ''} acá. Se envían solos cuando vuelva la señal.`
            : 'Podés seguir anotando: se guarda en el celular y se envía después.'}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 mt-3 px-3 py-2 rounded-sm bg-blue-950 text-blue-300 border border-blue-800">
      <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider">
        <CloudOff size={11} className={sincronizando ? 'animate-pulse' : ''} />
        {sincronizando ? 'ENVIANDO...' : `${pendientes} SIN ENVIAR`}
      </div>
    </div>
  );
};

// ── TopBar ───────────────────────────────────────────────────

export const TopBar = ({ titulo, subtitulo, acciones, onAbrirMenu }) => (
  <div className="border-b border-stone-200 bg-white px-4 sm:px-8 py-4 sm:py-5 flex items-center gap-3 shrink-0">
    <button
      onClick={onAbrirMenu}
      className="lg:hidden p-2 -ml-2 text-stone-600 hover:bg-stone-100 rounded-sm"
      aria-label="Abrir menú"
    >
      <Menu size={22} />
    </button>

    <div className="min-w-0 flex-1">
      <div className="text-[11px] tracking-[0.25em] uppercase text-stone-500 mb-0.5 truncate">
        {subtitulo}
      </div>
      <h1 className="text-lg sm:text-2xl font-black text-stone-900 tracking-tight truncate">
        {titulo}
      </h1>
    </div>

    {acciones && <div className="flex items-center gap-3 shrink-0">{acciones}</div>}
  </div>
);

// ── Estados compartidos ──────────────────────────────────────

export const Cargando = ({ texto = 'Cargando...' }) => (
  <div className="p-8 text-center text-stone-500 text-sm">{texto}</div>
);

export const ErrorCarga = ({ mensaje, onReintentar }) => (
  <div className="m-4 sm:m-8 bg-red-50 border-2 border-red-200 rounded-sm p-5">
    <div className="font-bold text-red-900 mb-1">No se pudieron cargar los datos</div>
    <div className="text-sm text-red-800 mb-3">{mensaje}</div>
    {onReintentar && (
      <button
        onClick={onReintentar}
        className="bg-red-700 text-white px-4 py-2.5 rounded-sm text-xs font-black hover:bg-red-800"
      >
        REINTENTAR
      </button>
    )}
  </div>
);

export const SinDatos = ({ titulo, texto, accion }) => (
  <div className="p-8 sm:p-12 text-center">
    <div className="text-base font-bold text-stone-700 mb-1">{titulo}</div>
    <div className="text-sm text-stone-500 max-w-sm mx-auto leading-relaxed">{texto}</div>
    {accion && <div className="mt-4">{accion}</div>}
  </div>
);
