// ============================================================
// VISTA: Dashboard / Panel General v2.2
// La ganancia y sus KPIs ya no son texto fijo: se calculan en
// vivo desde RegistrosContext, la misma fuente que usa la vista
// de Registros y el nuevo módulo de Reportes.
// ============================================================

import React, { useState } from 'react';
import {
  AlertTriangle, Sparkles, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, Wallet, Users,
} from 'lucide-react';
import { VENTAS_SEMANA } from '../data/mockData';
import { useRegistros } from '../context/RegistrosContext';

export const Dashboard = () => {
  const {
    registros, totalIngresos, totalEgresos, totalPersonal,
    gananciaReal, gananciaSinMezcla,
  } = useRegistros();

  const [desgloseAbierto, setDesgloseAbierto] = useState(false);
  const maxIngreso = Math.max(...VENTAS_SEMANA.map(v => v.ingreso));
  const ultimosRegistros = registros.slice(0, 5);

  return (
    <div className="p-8 space-y-6">

      {/* Alerta de mezcla personal/negocio — ahora con el número real */}
      {totalPersonal > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-sm p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <div className="text-sm font-black text-amber-900 mb-0.5">Gastos personales mezclados con el negocio</div>
            <div className="text-xs text-amber-800">
              Se detectaron <strong>Bs. {totalPersonal.toFixed(2)}</strong> en gastos personales registrados desde la caja del negocio.
              Esto reduce tu ganancia real en el mismo monto.{' '}
              <button onClick={() => setDesgloseAbierto(true)} className="underline font-bold">Ver el cálculo →</button>
            </div>
          </div>
        </div>
      )}

      {/* KPIs — todos calculados en vivo desde el mismo context */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200 p-5 rounded-sm hover:border-stone-400 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp size={16} className="text-green-600" />
          </div>
          <div className="text-2xl font-black text-stone-900 mb-1">Bs. {totalIngresos.toFixed(2)}</div>
          <div className="text-[10px] text-stone-500 uppercase tracking-wider">Ingresos registrados</div>
        </div>

        <div className="bg-white border border-stone-200 p-5 rounded-sm hover:border-stone-400 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <TrendingDown size={16} className="text-red-600" />
          </div>
          <div className="text-2xl font-black text-stone-900 mb-1">Bs. {totalEgresos.toFixed(2)}</div>
          <div className="text-[10px] text-stone-500 uppercase tracking-wider">Egresos registrados</div>
        </div>

        {/* Ganancia real — clickeable, dispara el desglose */}
        <button
          onClick={() => setDesgloseAbierto(o => !o)}
          className={`text-left p-5 rounded-sm border transition-colors ${
            desgloseAbierto ? 'bg-stone-900 border-stone-900' : 'bg-white border-stone-200 hover:border-stone-400'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <Wallet size={16} className={desgloseAbierto ? 'text-orange-400' : 'text-stone-500'} />
            {desgloseAbierto ? <ChevronUp size={14} className="text-stone-400" /> : <ChevronDown size={14} className="text-stone-400" />}
          </div>
          <div className={`text-2xl font-black mb-1 ${desgloseAbierto ? 'text-orange-400' : 'text-stone-900'} ${gananciaReal < 0 && !desgloseAbierto ? 'text-red-700' : ''}`}>
            Bs. {gananciaReal.toFixed(2)}
          </div>
          <div className={`text-[10px] uppercase tracking-wider ${desgloseAbierto ? 'text-stone-400' : 'text-stone-500'}`}>
            Ganancia real · tocá para ver el cálculo
          </div>
        </button>

        <div className={`p-5 rounded-sm border ${totalPersonal > 0 ? 'border-amber-300 bg-amber-50' : 'border-stone-200 bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <Users size={16} className={totalPersonal > 0 ? 'text-amber-600' : 'text-stone-400'} />
          </div>
          <div className={`text-2xl font-black mb-1 ${totalPersonal > 0 ? 'text-amber-800' : 'text-stone-900'}`}>Bs. {totalPersonal.toFixed(2)}</div>
          <div className="text-[10px] text-stone-500 uppercase tracking-wider">Gastos personales mezclados</div>
        </div>
      </div>

      {/* Desglose expandible: cómo se calculó la ganancia */}
      {desgloseAbierto && (
        <div className="bg-stone-950 text-white rounded-sm p-6 -mt-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-[10px] tracking-[0.25em] uppercase text-orange-400 mb-1">Cómo se calculó</div>
              <h3 className="text-lg font-black">Tu ganancia, paso a paso</h3>
            </div>
            <button onClick={() => setDesgloseAbierto(false)} className="text-stone-500 hover:text-white">
              <ChevronUp size={18} />
            </button>
          </div>

          <div className="space-y-0">
            <div className="flex justify-between items-center py-3 border-b border-stone-800">
              <span className="text-sm text-stone-300">Total de ingresos registrados</span>
              <span className="font-bold text-green-400">+ Bs. {totalIngresos.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-stone-800">
              <span className="text-sm text-stone-300">Total de egresos registrados</span>
              <span className="font-bold text-red-400">− Bs. {totalEgresos.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-stone-800 pl-4">
              <span className="text-xs text-amber-400">↳ de los cuales, gastos personales mezclados</span>
              <span className="text-xs text-amber-400">Bs. {totalPersonal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-4 border-b-2 border-stone-700">
              <span className="text-sm font-bold">= Ganancia real (con gastos mezclados incluidos)</span>
              <span className="text-xl font-black text-orange-400">Bs. {gananciaReal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-4 bg-green-950/40 -mx-6 px-6 mt-2 rounded-sm">
              <div>
                <div className="text-sm font-bold text-green-300">Ganancia real solo del negocio</div>
                <div className="text-[11px] text-green-500/80">si sacás los gastos personales de la cuenta</div>
              </div>
              <span className="text-2xl font-black text-green-400">Bs. {gananciaSinMezcla.toFixed(2)}</span>
            </div>
          </div>

          <p className="text-[11px] text-stone-500 mt-4 leading-relaxed">
            Este cálculo usa los mismos registros de la vista "Ingresos y Egresos" — si agregás o marcás algo ahí,
            este número se actualiza solo.
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Gráfico ingresos vs egresos (semana de referencia) */}
        <div className="col-span-2 bg-white border border-stone-200 p-6 rounded-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-[10px] tracking-[0.25em] uppercase text-stone-500 mb-1">Esta semana</div>
              <h2 className="text-xl font-black tracking-tight">Ingresos vs Egresos</h2>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-orange-500 inline-block" /> Ingresos</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-stone-300 inline-block" /> Egresos</span>
            </div>
          </div>
          <div className="flex items-end gap-4 h-48">
            {VENTAS_SEMANA.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex-1 flex items-end gap-1">
                  <div className="flex-1 flex items-end">
                    <div
                      className="w-full bg-orange-500 hover:bg-orange-600 transition-colors rounded-t-sm relative group"
                      style={{ height: `${(v.ingreso / maxIngreso) * 100}%` }}
                    >
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-[10px] px-1.5 py-0.5 rounded-sm whitespace-nowrap z-10">
                        Bs. {v.ingreso}
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 flex items-end">
                    <div
                      className="w-full bg-stone-300 hover:bg-stone-400 transition-colors rounded-t-sm relative group"
                      style={{ height: `${(v.egreso / maxIngreso) * 100}%` }}
                    >
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-[10px] px-1.5 py-0.5 rounded-sm whitespace-nowrap z-10">
                        Bs. {v.egreso}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-[10px] font-semibold text-stone-500">{v.dia}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Panel IA adaptado al usuario */}
        <div className="bg-stone-950 text-stone-100 p-6 rounded-sm flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={15} className="text-orange-400" />
            <div className="text-[10px] tracking-[0.25em] uppercase text-orange-400">Recomendación</div>
          </div>
          <h3 className="text-base font-black leading-snug mb-3">Tu prenda más rentable esta semana</h3>
          <div className="text-3xl font-black text-orange-400 mb-1">Polera Negra M</div>
          <div className="text-xs text-stone-400 mb-auto">18 unidades · Ganancia real Bs. 22.30 c/u</div>

          <div className="space-y-2 pt-4 border-t border-stone-800 mt-4 text-xs">
            <div className="flex justify-between">
              <span className="text-stone-400">Te cuesta hacer</span>
              <span className="font-bold">Bs. 41.50</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">La vendés a</span>
              <span className="font-bold">Bs. 65.00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Ganás por unidad</span>
              <span className="font-bold text-green-400">Bs. 23.50</span>
            </div>
          </div>

          <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-sm p-3 text-xs text-amber-300">
            ⚠ Solo te quedan <strong>4 unidades</strong>. Producí más antes del fin de semana.
          </div>
        </div>
      </div>

      {/* Últimas transacciones — mismos datos que la vista Registros */}
      <div className="bg-white border border-stone-200 rounded-sm overflow-hidden">
        <div className="p-5 border-b border-stone-200 flex justify-between items-center">
          <div>
            <div className="text-[10px] tracking-[0.25em] uppercase text-stone-500 mb-1">Movimientos recientes</div>
            <h2 className="text-lg font-black tracking-tight">Últimos registros</h2>
          </div>
          <span className="text-xs text-stone-400">{registros.length} en total</span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-stone-50">
            <tr className="text-left text-[10px] tracking-[0.2em] uppercase text-stone-500">
              <th className="px-5 py-3 font-medium">Fecha</th>
              <th className="px-5 py-3 font-medium">Descripción</th>
              <th className="px-5 py-3 font-medium">Categoría</th>
              <th className="px-5 py-3 font-medium text-center">Origen</th>
              <th className="px-5 py-3 font-medium text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            {ultimosRegistros.map(r => (
              <tr key={r.id} className={`border-b border-stone-100 hover:bg-stone-50 ${r.origen === 'personal' ? 'bg-amber-50/50' : ''}`}>
                <td className="px-5 py-3 font-mono text-xs text-stone-500">{r.fecha}</td>
                <td className="px-5 py-3 font-medium text-sm">
                  {r.descripcion}
                  {r.origen === 'personal' && (
                    <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-sm font-bold">PERSONAL</span>
                  )}
                </td>
                <td className="px-5 py-3 text-xs text-stone-500">{r.categoria}</td>
                <td className="px-5 py-3 text-center">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${r.origen === 'negocio' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                    {r.origen.toUpperCase()}
                  </span>
                </td>
                <td className={`px-5 py-3 text-right font-black ${r.tipo === 'ingreso' ? 'text-green-700' : 'text-red-600'}`}>
                  {r.tipo === 'ingreso' ? '+' : '-'} Bs. {r.monto.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
