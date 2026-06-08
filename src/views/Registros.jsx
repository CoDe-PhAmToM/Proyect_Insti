// ============================================================
// VISTA: Registros de Ingresos y Egresos v2.0
// ============================================================

import React, { useState } from 'react';
import { Plus, AlertTriangle, TrendingUp, TrendingDown, Filter } from 'lucide-react';
import { REGISTROS } from '../data/mockData';

export const Registros = () => {
  const [filtro, setFiltro] = useState('todos');

  const totalIngresos = REGISTROS.filter(r => r.tipo === 'ingreso').reduce((a, r) => a + r.monto, 0);
  const totalEgresos  = REGISTROS.filter(r => r.tipo === 'egreso').reduce((a, r) => a + r.monto, 0);
  const totalPersonal = REGISTROS.filter(r => r.origen === 'personal').reduce((a, r) => a + r.monto, 0);
  const gananciaReal  = totalIngresos - totalEgresos;

  const registrosFiltrados = REGISTROS.filter(r => {
    if (filtro === 'todos')    return true;
    if (filtro === 'ingresos') return r.tipo === 'ingreso';
    if (filtro === 'egresos')  return r.tipo === 'egreso';
    if (filtro === 'personal') return r.origen === 'personal';
    return true;
  });

  return (
    <div className="p-8 space-y-6">

      {/* Advertencia gastos mezclados */}
      {totalPersonal > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-black text-amber-900 text-sm mb-1">
                Bs. {totalPersonal} en gastos personales mezclados con el negocio
              </div>
              <div className="text-xs text-amber-800 leading-relaxed">
                Esto hace que tu ganancia real parezca menor de lo que es. Se recomienda separar estos gastos
                para conocer la rentabilidad real del negocio. Los registros marcados como <strong>PERSONAL</strong> están resaltados abajo.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resumen del período */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-stone-200 p-5 rounded-sm">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-green-600" />
            <div className="text-[10px] tracking-[0.25em] uppercase text-stone-500">Total ingresos</div>
          </div>
          <div className="text-3xl font-black text-green-700">Bs. {totalIngresos.toFixed(2)}</div>
          <div className="text-xs text-stone-500 mt-1">{REGISTROS.filter(r=>r.tipo==='ingreso').length} registros</div>
        </div>

        <div className="bg-white border border-stone-200 p-5 rounded-sm">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown size={16} className="text-red-600" />
            <div className="text-[10px] tracking-[0.25em] uppercase text-stone-500">Total egresos</div>
          </div>
          <div className="text-3xl font-black text-red-700">Bs. {totalEgresos.toFixed(2)}</div>
          <div className="text-xs text-stone-500 mt-1">
            Incluye <span className="text-amber-700 font-bold">Bs. {totalPersonal} personales</span>
          </div>
        </div>

        <div className={`p-5 rounded-sm border ${gananciaReal >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="text-[10px] tracking-[0.25em] uppercase text-stone-500 mb-3">Ganancia del período</div>
          <div className={`text-3xl font-black ${gananciaReal >= 0 ? 'text-green-800' : 'text-red-800'}`}>
            Bs. {gananciaReal.toFixed(2)}
          </div>
          <div className="text-xs text-stone-600 mt-1">
            Sin gastos personales: <strong className="text-green-800">Bs. {(gananciaReal + totalPersonal).toFixed(2)}</strong>
          </div>
        </div>
      </div>

      {/* Tabla de registros */}
      <div className="bg-white border border-stone-200 rounded-sm overflow-hidden">
        <div className="p-5 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[10px] tracking-[0.25em] uppercase text-stone-500 mb-1">Libro de cuentas</div>
            <h2 className="text-xl font-black tracking-tight">Todos los movimientos</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Filtros */}
            <Filter size={14} className="text-stone-400" />
            {[
              { key: 'todos',    label: 'Todos'    },
              { key: 'ingresos', label: 'Ingresos' },
              { key: 'egresos',  label: 'Egresos'  },
              { key: 'personal', label: '⚠ Personales' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFiltro(f.key)}
                className={`px-3 py-1.5 text-xs font-bold rounded-sm transition-colors ${
                  filtro === f.key
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {f.label}
              </button>
            ))}
            <button className="flex items-center gap-1.5 bg-orange-500 text-stone-950 px-4 py-1.5 text-xs font-black rounded-sm hover:bg-orange-400 ml-2">
              <Plus size={13} /> NUEVO REGISTRO
            </button>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-stone-50">
            <tr className="text-left text-[10px] tracking-[0.2em] uppercase text-stone-500">
              <th className="px-5 py-3 font-medium">Fecha</th>
              <th className="px-5 py-3 font-medium">Descripción</th>
              <th className="px-5 py-3 font-medium">Categoría</th>
              <th className="px-5 py-3 font-medium text-center">Tipo</th>
              <th className="px-5 py-3 font-medium text-center">Origen</th>
              <th className="px-5 py-3 font-medium text-right">Monto (Bs.)</th>
            </tr>
          </thead>
          <tbody>
            {registrosFiltrados.map(r => (
              <tr
                key={r.id}
                className={`border-b border-stone-100 hover:bg-stone-50 transition-colors ${
                  r.origen === 'personal' ? 'bg-amber-50/60' : ''
                }`}
              >
                <td className="px-5 py-3 font-mono text-xs text-stone-500 whitespace-nowrap">{r.fecha}</td>
                <td className="px-5 py-3">
                  <span className="font-medium">{r.descripcion}</span>
                  {r.origen === 'personal' && (
                    <span className="ml-2 text-[9px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-sm font-black tracking-wider">
                      MEZCLADO
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-xs text-stone-500">{r.categoria}</td>
                <td className="px-5 py-3 text-center">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${
                    r.tipo === 'ingreso'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {r.tipo.toUpperCase()}
                  </span>
                </td>
                <td className="px-5 py-3 text-center">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${
                    r.origen === 'negocio'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {r.origen.toUpperCase()}
                  </span>
                </td>
                <td className={`px-5 py-3 text-right font-black tabular-nums ${
                  r.tipo === 'ingreso' ? 'text-green-700' : 'text-red-600'
                }`}>
                  {r.tipo === 'ingreso' ? '+' : '-'} {r.monto.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-stone-100 border-t-2 border-stone-300">
            <tr>
              <td colSpan={5} className="px-5 py-3 text-sm font-black uppercase tracking-wider">
                Ganancia del período
              </td>
              <td className={`px-5 py-3 text-right text-lg font-black tabular-nums ${
                gananciaReal >= 0 ? 'text-green-700' : 'text-red-700'
              }`}>
                Bs. {gananciaReal.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
