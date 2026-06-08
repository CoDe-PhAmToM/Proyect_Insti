// ============================================================
// VISTA: Recomendaciones IA v2.0
// ============================================================

import React from 'react';
import { Sparkles, TrendingUp, Target, AlertTriangle, Activity, ChevronRight } from 'lucide-react';
import { RECOMENDACIONES_IA } from '../data/mockData';

const configTipo = {
  oportunidad: { icon: TrendingUp,    label: 'OPORTUNIDAD',   colorBg: 'bg-green-100',  colorText: 'text-green-800',  colorIcon: 'text-green-700'  },
  precio:      { icon: Target,        label: 'PRECIO',        colorBg: 'bg-blue-100',   colorText: 'text-blue-800',   colorIcon: 'text-blue-700'   },
  alerta:      { icon: AlertTriangle, label: 'ALERTA',        colorBg: 'bg-red-100',    colorText: 'text-red-800',    colorIcon: 'text-red-700'    },
  forecast:    { icon: Activity,      label: 'PRONÓSTICO',    colorBg: 'bg-purple-100', colorText: 'text-purple-800', colorIcon: 'text-purple-700' },
};

const badgeUrgencia = {
  alta:  'bg-red-500 text-white',
  media: 'bg-yellow-400 text-stone-900',
  baja:  'bg-green-100 text-green-900',
};

export const InteligenciaIA = () => (
  <div className="p-8 space-y-6">

    {/* Header */}
    <div className="bg-gradient-to-br from-stone-950 via-stone-900 to-orange-950 text-white p-8 rounded-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={18} className="text-orange-400" />
          <div className="text-[10px] tracking-[0.3em] uppercase text-orange-400">Motor de análisis</div>
        </div>
        <h2 className="text-3xl font-black tracking-tight max-w-xl leading-tight mb-4">
          {RECOMENDACIONES_IA.length} cosas que podés mejorar en tu negocio ahora mismo.
        </h2>
        <p className="text-sm text-stone-400 max-w-xl leading-relaxed mb-6">
          El sistema analizó tus ventas, costos e inventario y encontró estas oportunidades.
          No necesitás saber de tecnología — cada recomendación te dice exactamente qué hacer.
        </p>
        <div className="flex flex-wrap gap-6 text-xs">
          <div>
            <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500 mb-1">Registros analizados</div>
            <div className="font-bold">247 movimientos</div>
          </div>
          <div>
            <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500 mb-1">Período</div>
            <div className="font-bold">Últimos 60 días</div>
          </div>
          <div>
            <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500 mb-1">Actualizado</div>
            <div className="font-bold">Hoy a las 08:15</div>
          </div>
        </div>
      </div>
    </div>

    {/* Aviso sobre la IA con datos insuficientes */}
    <div className="bg-blue-50 border border-blue-200 p-4 rounded-sm text-xs text-blue-900">
      <strong>Nota:</strong> Estas recomendaciones se van a volver más precisas con el tiempo.
      Cuantos más meses de ventas y gastos registrés, mejor va a funcionar el análisis.
      Por ahora el sistema usa tus datos de los últimos 2 meses.
    </div>

    {/* Tarjetas de recomendación */}
    <div className="grid grid-cols-2 gap-5">
      {RECOMENDACIONES_IA.map((rec, i) => {
        const cfg  = configTipo[rec.tipo];
        const Icon = cfg.icon;
        return (
          <div
            key={i}
            className="bg-white border border-stone-200 p-6 rounded-sm hover:border-stone-400 transition-colors flex flex-col gap-4"
          >
            {/* Header de la tarjeta */}
            <div className="flex items-start justify-between gap-3">
              <div className={`p-2 rounded-sm ${cfg.colorBg} shrink-0`}>
                <Icon size={16} className={cfg.colorIcon} />
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-sm ${badgeUrgencia[rec.urgencia]} uppercase tracking-wider`}>
                  {rec.urgencia === 'alta' ? '🔴 URGENTE' : rec.urgencia === 'media' ? '🟡 PRONTO' : '🟢 CUANDO PUEDAS'}
                </span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-sm ${cfg.colorBg} ${cfg.colorText} tracking-wider`}>
                  {cfg.label}
                </span>
              </div>
            </div>

            {/* Contenido */}
            <div className="flex-1">
              <h3 className="font-black text-base text-stone-900 mb-2 leading-snug">{rec.titulo}</h3>
              <p className="text-sm text-stone-600 leading-relaxed">{rec.desc}</p>
            </div>

            {/* Acción */}
            <button className="flex items-center gap-1 text-xs font-black text-stone-900 hover:text-orange-600 transition-colors border-t border-stone-100 pt-3">
              {rec.accion.toUpperCase()} <ChevronRight size={13} />
            </button>
          </div>
        );
      })}
    </div>
  </div>
);
