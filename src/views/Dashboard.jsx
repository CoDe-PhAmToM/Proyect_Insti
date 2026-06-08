// ============================================================
// VISTA: Dashboard / Panel General v2.0
// Refleja el problema real: rentabilidad, mezcla personal/negocio
// ============================================================

import React from 'react';
import { TrendingUp, TrendingDown, Activity, AlertTriangle, ArrowUpRight, ArrowDownRight, Sparkles } from 'lucide-react';
import { KPIS, VENTAS_SEMANA } from '../data/mockData';

const iconMap = { TrendingUp, TrendingDown, Activity, AlertTriangle };

export const Dashboard = () => {
  const maxIngreso = Math.max(...VENTAS_SEMANA.map(v => v.ingreso));

  return (
    <div className="p-8 space-y-6">

      {/* Alerta de mezcla personal/negocio — problema central del proyecto */}
      <div className="bg-amber-50 border border-amber-300 rounded-sm p-4 flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
        <div>
          <div className="text-sm font-black text-amber-900 mb-0.5">Gastos personales mezclados con el negocio este mes</div>
          <div className="text-xs text-amber-800">
            Se detectaron <strong>Bs. 320</strong> en gastos personales registrados desde la caja del negocio (mercado familiar, transporte escolar).
            Esto reduce artificialmente tu ganancia real. <button className="underline font-bold">Ver registros →</button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {KPIS.map((kpi, i) => (
          <div key={i} className={`bg-white border p-5 rounded-sm transition-colors hover:border-stone-400 ${
            i === 3 ? 'border-amber-300 bg-amber-50' : 'border-stone-200'
          }`}>
            <div className={`flex items-center justify-between mb-4`}>
              <div className={`text-xs font-bold flex items-center gap-1 ${kpi.up ? 'text-green-700' : 'text-red-700'}`}>
                {kpi.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {kpi.change}
              </div>
              <div className={`w-2 h-2 rounded-full ${kpi.up ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>
            <div className="text-2xl font-black text-stone-900 mb-1">{kpi.value}</div>
            <div className="text-[10px] text-stone-500 uppercase tracking-wider">{kpi.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Gráfico ingresos vs egresos */}
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
                  {/* Ingreso */}
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
                  {/* Egreso */}
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

      {/* Últimas transacciones resumidas */}
      <div className="bg-white border border-stone-200 rounded-sm overflow-hidden">
        <div className="p-5 border-b border-stone-200 flex justify-between items-center">
          <div>
            <div className="text-[10px] tracking-[0.25em] uppercase text-stone-500 mb-1">Movimientos recientes</div>
            <h2 className="text-lg font-black tracking-tight">Últimos registros</h2>
          </div>
          <button className="text-xs font-bold text-orange-600 hover:text-orange-700">VER TODOS →</button>
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
            {[
              { fecha:'02/06', desc:'Venta 3 poleras negras talla M',       cat:'Venta prendas',  origen:'negocio',  tipo:'ingreso', monto: 195  },
              { fecha:'02/06', desc:'Compra 5m tela algodón peinado',       cat:'Materia prima',  origen:'negocio',  tipo:'egreso',  monto: 142  },
              { fecha:'02/06', desc:'Mercado familiar (mezclado del negocio)',cat:'Gasto personal',origen:'personal', tipo:'egreso',  monto: 85   },
              { fecha:'01/06', desc:'Pedido corporativo 10 polos',          cat:'Venta prendas',  origen:'negocio',  tipo:'ingreso', monto: 750  },
              { fecha:'01/06', desc:'Transporte escolar (caja del negocio)',  cat:'Gasto personal',origen:'personal', tipo:'egreso',  monto: 40   },
            ].map((r, i) => (
              <tr key={i} className={`border-b border-stone-100 hover:bg-stone-50 ${r.origen === 'personal' ? 'bg-amber-50/50' : ''}`}>
                <td className="px-5 py-3 font-mono text-xs text-stone-500">{r.fecha}</td>
                <td className="px-5 py-3 font-medium text-sm">
                  {r.desc}
                  {r.origen === 'personal' && (
                    <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-sm font-bold">PERSONAL</span>
                  )}
                </td>
                <td className="px-5 py-3 text-xs text-stone-500">{r.cat}</td>
                <td className="px-5 py-3 text-center">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${r.origen === 'negocio' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                    {r.origen.toUpperCase()}
                  </span>
                </td>
                <td className={`px-5 py-3 text-right font-black ${r.tipo === 'ingreso' ? 'text-green-700' : 'text-red-600'}`}>
                  {r.tipo === 'ingreso' ? '+' : '-'} Bs. {r.monto}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
