// ============================================================
// APP PRINCIPAL v2.0
// Plataforma de Gestión Financiera para la Rentabilidad
// Microempresas de Confección Informal · Distrito 6, El Alto
// ============================================================

import React, { useState } from 'react';

import { Sidebar, TopBar }          from './components/Layout';
import { Dashboard }                from './views/Dashboard';
import { Registros }                from './views/Registros';
import { Materiales, Costeo }       from './views/MaterialesCosteo';
import { InteligenciaIA }           from './views/InteligenciaIA';
import { Catalogo, Personalizador } from './views/CatalogoPersonalizar';
import { USUARIO }                  from './data/mockData';

// ── Configuración de vistas ──────────────────────────────────
const VISTAS = {
  dashboard:    { titulo: 'Panel general',         subtitulo: 'Resumen ejecutivo'         },
  registros:    { titulo: 'Ingresos y Egresos',    subtitulo: 'Registro financiero diario' },
  materiales:   { titulo: 'Materiales e insumos',  subtitulo: 'Inventario de producción'  },
  costeo:       { titulo: 'Costeo de producción',  subtitulo: 'Cálculo de costos'         },
  ia:           { titulo: 'Recomendaciones',       subtitulo: 'Inteligencia analítica'    },
  catalogo:     { titulo: 'Catálogo público',      subtitulo: 'Tienda online · Cliente'   },
  personalizar: { titulo: 'Personalizador',        subtitulo: 'Editor 2D · Cliente'       },
};

// ── App ──────────────────────────────────────────────────────
export default function App() {
  const [vista, setVista] = useState('dashboard');
  const config = VISTAS[vista];

  // La vista del personalizador ocupa toda la pantalla (sin TopBar)
  const sinTopBar = vista === 'personalizar';

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      <Sidebar vista={vista} setVista={setVista} usuario={USUARIO} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {!sinTopBar && (
          <TopBar titulo={config.titulo} subtitulo={config.subtitulo} />
        )}

        <div className="flex-1 overflow-y-auto">
          {vista === 'dashboard'    && <Dashboard />}
          {vista === 'registros'    && <Registros />}
          {vista === 'materiales'   && <Materiales />}
          {vista === 'costeo'       && <Costeo />}
          {vista === 'ia'           && <InteligenciaIA />}
          {vista === 'catalogo'     && <Catalogo setVista={setVista} />}
          {vista === 'personalizar' && <Personalizador />}
        </div>

      </main>
    </div>
  );
}
