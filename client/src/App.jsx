// ============================================================
// APP PRINCIPAL v3.0
// Plataforma de Gestión Financiera para la Rentabilidad
// Microempresas de Confección Informal · Distrito 6, El Alto
//
// Equipo: Ingeniería de Sistemas + Contaduría Pública
// MSc. MBA. Ing. José Filemón Ayaviri Guzmán
// Ing. Rolando Alarcon Choquehuanca
//
// v3: los datos vienen del servidor. Sin sesión no hay pantalla.
// ============================================================

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Sidebar, TopBar }          from './components/Layout';
import { Dashboard }                from './views/Dashboard';
import { Registros }                from './views/Registros';
import { Materiales, Costeo }       from './views/MaterialesCosteo';
import { Ordenes }                  from './views/Ordenes';
import { PedidosTaller, MisPedidos } from './views/Pedidos';
import { Equipo }                   from './views/Equipo';
import { Usabilidad }               from './views/Usabilidad';
import { Investigador }             from './views/Investigador';
import { Reportes }                 from './views/Reportes';
import { InteligenciaIA }           from './views/InteligenciaIA';
import { Catalogo, Personalizador } from './views/CatalogoPersonalizar';
import { Login }                    from './views/Login';
import { NAV_ITEMS, vistaInicial, puedeVer } from './data/navigation';
import { LimiteError }              from './components/LimiteError';
import { AvisoProvider }            from './components/Aviso';

import { AuthProvider, useAuth }    from './context/AuthContext';
import { MaterialesProvider }       from './context/MaterialesContext';
import { CartProvider }             from './context/CartContext';
import { RegistrosProvider }        from './context/RegistrosContext';
import { OrdenesProvider }          from './context/OrdenesContext';

// ── Pantalla mientras revive la sesión ───────────────────────
// El plan gratuito de Render duerme el servidor: la primera
// petición puede tardar. Mejor decirlo que parecer colgado.
const Cargando = () => (
  <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center gap-4 text-stone-400">
    <Loader2 size={28} className="animate-spin text-orange-500" />
    <div className="text-center">
      <div className="text-sm font-bold text-stone-200">Abriendo tu taller</div>
      <div className="text-xs mt-1">
        Si es la primera vez del día, el servidor puede tardar unos segundos en despertar.
      </div>
    </div>
  </div>
);

// ── Contenido con sesión activa ──────────────────────────────
const AppConSesion = () => {
  const { usuario, salir, esCliente, esAdmin } = useAuth();

  const rolVista = esAdmin ? 'admin' : esCliente ? 'cliente' : 'productor';
  const [vista, setVista] = useState(vistaInicial(rolVista));
  const [menuAbierto, setMenuAbierto] = useState(false);

  // Si el rol no puede ver esta pantalla, se lo manda al inicio.
  // Pasa si un ayudante tenia abierta una vista y el dueno le cambio
  // el rol, o si alguien escribe la vista a mano.
  const vistaValida = puedeVer(vista, usuario?.rol) ? vista : vistaInicial(rolVista);
  if (vistaValida !== vista) setVista(vistaValida);

  const config = NAV_ITEMS.find((i) => i.id === vista);
  const sinTopBar = vista === 'personalizar';

  return (
    <div
      className="flex h-screen bg-stone-50 overflow-hidden"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <Sidebar
        vista={vista}
        setVista={setVista}
        usuario={usuario}
        rol={rolVista}
        onSalir={salir}
        abierto={menuAbierto}
        onCerrar={() => setMenuAbierto(false)}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {!sinTopBar && config && (
          <TopBar
            titulo={config.titulo}
            subtitulo={config.subtitulo}
            onAbrirMenu={() => setMenuAbierto(true)}
          />
        )}

        <div className="flex-1 overflow-y-auto">
          <LimiteError clave={vista} nombre={vista}>
          {vista === 'dashboard'    && <Dashboard onIr={setVista} />}
          {vista === 'registros'    && <Registros />}
          {vista === 'materiales'   && <Materiales />}
          {vista === 'ordenes'      && <Ordenes />}
          {vista === 'costeo'       && <Costeo />}
          {vista === 'reportes'     && <Reportes />}
          {vista === 'ia'           && <InteligenciaIA />}
          {vista === 'pedidos'      && <PedidosTaller />}
          {vista === 'equipo'       && <Equipo />}
          {vista === 'usabilidad'   && <Usabilidad />}
          {vista === 'investigador' && <Investigador />}
          {vista === 'mispedidos'   && <MisPedidos />}
          {vista === 'catalogo'     && <Catalogo setVista={setVista} />}
          {vista === 'personalizar' && <Personalizador />}
          </LimiteError>
        </div>
      </main>
    </div>
  );
};

const Enrutador = () => {
  const { usuario, cargando } = useAuth();

  if (cargando) return <Cargando />;
  if (!usuario) return <Login />;

  return (
    <AvisoProvider>
    <MaterialesProvider>
      <RegistrosProvider>
        <OrdenesProvider>
          <CartProvider>
            <AppConSesion />
          </CartProvider>
        </OrdenesProvider>
      </RegistrosProvider>
    </MaterialesProvider>
    </AvisoProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Enrutador />
    </AuthProvider>
  );
}
