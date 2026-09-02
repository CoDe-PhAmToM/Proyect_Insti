// ============================================================
// APP PRINCIPAL v2.2
// Plataforma de Gestión Financiera para la Rentabilidad
// Microempresas de Confección Informal · Distrito 6, El Alto
//
// Equipo: Ingeniería de Sistemas + Contaduría Pública
// MSc. MBA. Ing. José Filemón Ayaviri Guzmán
// Ing. Rolando Alarcon Choquehuanca
// ============================================================

import React, { useState } from 'react';

import { Sidebar, TopBar }          from './components/Layout';
import { Dashboard }                from './views/Dashboard';
import { Registros }                from './views/Registros';
import { Materiales, Costeo }       from './views/MaterialesCosteo';
import { Reportes }                 from './views/Reportes';
import { InteligenciaIA }           from './views/InteligenciaIA';
import { Catalogo, Personalizador } from './views/CatalogoPersonalizar';
import { USUARIO, USUARIO_CLIENTE } from './data/mockData';
import { NAV_ITEMS, vistaInicial }  from './data/navigation';
import { MaterialesProvider }       from './context/MaterialesContext';
import { CartProvider }             from './context/CartContext';
import { RegistrosProvider }        from './context/RegistrosContext';

// ── App ──────────────────────────────────────────────────────
export default function App() {
  const [rol, setRolState]  = useState('productor');
  const [vista, setVista]   = useState(vistaInicial('productor'));

  const config = NAV_ITEMS.find(i => i.id === vista);
  const usuario = rol === 'productor' ? USUARIO : USUARIO_CLIENTE;

  // Cambiar de rol reubica automáticamente a la primera vista
  // válida de ese rol — nunca deja al usuario en una pantalla
  // que no le corresponde.
  const cambiarRol = (nuevoRol) => {
    setRolState(nuevoRol);
    setVista(vistaInicial(nuevoRol));
  };

  // El personalizador ocupa toda la pantalla (sin TopBar)
  const sinTopBar = vista === 'personalizar';

  return (
    <MaterialesProvider>
      <RegistrosProvider>
        <CartProvider>
          <div className="flex h-screen bg-stone-50 overflow-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

            <Sidebar vista={vista} setVista={setVista} usuario={usuario} rol={rol} setRol={cambiarRol} />

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

              {!sinTopBar && config && (
                <TopBar titulo={config.titulo} subtitulo={config.subtitulo} />
              )}

              <div className="flex-1 overflow-y-auto">
                {vista === 'dashboard'    && <Dashboard />}
                {vista === 'registros'    && <Registros />}
                {vista === 'materiales'   && <Materiales />}
                {vista === 'costeo'       && <Costeo />}
                {vista === 'reportes'     && <Reportes />}
                {vista === 'ia'           && <InteligenciaIA />}
                {vista === 'catalogo'     && <Catalogo setVista={setVista} />}
                {vista === 'personalizar' && <Personalizador />}
              </div>

            </main>
          </div>
        </CartProvider>
      </RegistrosProvider>
    </MaterialesProvider>
  );
}
