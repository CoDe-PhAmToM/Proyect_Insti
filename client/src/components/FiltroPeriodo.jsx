// ============================================================
// FILTRO POR PERÍODO
//
// Hasta ahora Registros mostraba TODO junto, desde el primer día.
// "¿Cuánto gané este mes?" es la primera pregunta que hace
// cualquiera, y no se podía responder sin sumar a mano.
//
// Los atajos están antes que las fechas sueltas a propósito: casi
// siempre se quiere "este mes" o "el mes pasado", y elegir dos
// fechas en un calendario desde un celular es incómodo.
// ============================================================

import React, { useState } from 'react';
import { Calendar, X } from 'lucide-react';

const hoy = () => new Date();
const iso = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const ATAJOS = [
  {
    id: 'mes',
    label: 'Este mes',
    calcular: () => {
      const d = hoy();
      return { desde: iso(new Date(d.getFullYear(), d.getMonth(), 1)), hasta: iso(d) };
    },
  },
  {
    id: 'mes-pasado',
    label: 'El mes pasado',
    calcular: () => {
      const d = hoy();
      return {
        desde: iso(new Date(d.getFullYear(), d.getMonth() - 1, 1)),
        hasta: iso(new Date(d.getFullYear(), d.getMonth(), 0)),
      };
    },
  },
  {
    id: 'trimestre',
    label: 'Últimos 3 meses',
    calcular: () => {
      const d = hoy();
      return { desde: iso(new Date(d.getFullYear(), d.getMonth() - 2, 1)), hasta: iso(d) };
    },
  },
  { id: 'todo', label: 'Todo', calcular: () => ({ desde: null, hasta: null }) },
];

export const FiltroPeriodo = ({ valor, onCambiar }) => {
  const [personalizado, setPersonalizado] = useState(false);

  const activo = ATAJOS.find((a) => {
    const r = a.calcular();
    return r.desde === valor?.desde && r.hasta === valor?.hasta;
  });

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {ATAJOS.map((a) => (
        <button
          key={a.id}
          onClick={() => {
            setPersonalizado(false);
            onCambiar(a.calcular());
          }}
          className={`px-3 py-1.5 rounded-sm text-xs font-bold ${
            activo?.id === a.id && !personalizado
              ? 'bg-stone-900 text-white'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          {a.label}
        </button>
      ))}

      <button
        onClick={() => setPersonalizado((p) => !p)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-bold ${
          personalizado ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
        }`}
      >
        <Calendar size={12} /> Otras fechas
      </button>

      {personalizado && (
        <div className="flex items-center gap-2 w-full sm:w-auto mt-1.5 sm:mt-0">
          <input
            type="date"
            value={valor?.desde ?? ''}
            max={valor?.hasta ?? iso(hoy())}
            onChange={(e) => onCambiar({ ...valor, desde: e.target.value || null })}
            className="px-2.5 py-1.5 border border-stone-300 rounded-sm text-xs"
          />
          <span className="text-xs text-stone-400">a</span>
          <input
            type="date"
            value={valor?.hasta ?? ''}
            min={valor?.desde ?? undefined}
            max={iso(hoy())}
            onChange={(e) => onCambiar({ ...valor, hasta: e.target.value || null })}
            className="px-2.5 py-1.5 border border-stone-300 rounded-sm text-xs"
          />
          <button
            onClick={() => {
              setPersonalizado(false);
              onCambiar({ desde: null, hasta: null });
            }}
            className="p-1 text-stone-400 hover:text-stone-700"
            title="Quitar el filtro"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
