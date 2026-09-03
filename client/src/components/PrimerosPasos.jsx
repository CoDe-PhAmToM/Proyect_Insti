// ============================================================
// PRIMEROS PASOS
//
// Una microempresaria entra por primera vez y ve un panel en cero,
// sin ninguna indicación de qué hacer. Para esta población — el
// documento insiste en baja alfabetización digital — eso es la
// causa número uno de abandono: no es que el sistema sea difícil,
// es que no hay una puerta de entrada.
//
// El orden de los pasos no es decorativo, es de dependencia: sin
// materiales no se puede cargar una receta, sin receta no se puede
// calcular el costo, sin gastos fijos no hay punto de equilibrio.
//
// Desaparece solo cuando los cuatro están hechos. Nada de un
// tutorial que hay que cerrar a mano.
// ============================================================

import React from 'react';
import { Check, ArrowRight, Rocket } from 'lucide-react';

export const PrimerosPasos = ({ configuracion, onIr }) => {
  if (!configuracion || configuracion.listo) return null;

  const { pasos, completos, total } = configuracion;
  const siguiente = pasos.find((p) => !p.hecho);

  return (
    <div className="bg-stone-950 text-white rounded-sm overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-stone-800">
        <div className="flex items-center gap-2 mb-2">
          <Rocket size={16} className="text-orange-400" />
          <div className="text-[11px] tracking-[0.25em] uppercase text-orange-400">
            Para empezar
          </div>
        </div>

        <h2 className="text-xl font-black tracking-tight mb-1">
          Te faltan {total - completos} {total - completos === 1 ? 'paso' : 'pasos'}
        </h2>
        <p className="text-xs text-stone-400 leading-relaxed max-w-lg">
          Cuando los completes, el sistema va a poder decirte cuánto te cuesta cada prenda y cuánto
          tenés que vender para no perder plata.
        </p>

        {/* Avance */}
        <div className="flex gap-1 mt-4">
          {pasos.map((p) => (
            <div
              key={p.id}
              className={`h-1.5 flex-1 rounded-sm ${p.hecho ? 'bg-orange-500' : 'bg-stone-800'}`}
            />
          ))}
        </div>
      </div>

      <div className="divide-y divide-stone-800">
        {pasos.map((p) => {
          const esSiguiente = p.id === siguiente?.id;
          return (
            <button
              key={p.id}
              onClick={() => !p.hecho && onIr?.(p.vista)}
              disabled={p.hecho}
              className={`w-full text-left px-5 sm:px-6 py-4 flex items-start gap-3.5 transition-colors ${
                p.hecho ? 'opacity-50' : esSiguiente ? 'bg-stone-900/60 hover:bg-stone-900' : 'hover:bg-stone-900/40'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center mt-0.5 ${
                  p.hecho
                    ? 'bg-green-600'
                    : esSiguiente
                      ? 'bg-orange-500 text-stone-950'
                      : 'border-2 border-stone-700'
                }`}
              >
                {p.hecho && <Check size={13} />}
              </div>

              <div className="min-w-0 flex-1">
                <div className={`font-bold text-sm ${p.hecho ? 'line-through' : ''}`}>
                  {p.titulo}
                </div>
                <div className="text-xs text-stone-400 leading-snug mt-0.5">{p.texto}</div>
              </div>

              {esSiguiente && (
                <ArrowRight size={16} className="text-orange-400 shrink-0 mt-1" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ── Comparación con el mes pasado ────────────────────────────
//
// El panel mostraba ingresos, egresos y ganancia. Pero la pregunta
// que se hace ella no es "cuánto gané" — es "¿me está yendo bien?",
// y eso solo se responde comparando.

export const Comparacion = ({ resumen, bs }) => {
  if (!resumen?.comparacion?.hayConQueComparar) return null;

  const { esteMes, mesPasado, comparacion } = resumen;
  const { diferencia, variacionPct, mejoro } = comparacion;

  return (
    <div
      className={`rounded-sm p-4 sm:p-5 border-2 ${
        mejoro ? 'bg-green-50 border-green-300' : 'bg-amber-50 border-amber-300'
      }`}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className={`text-sm font-black ${mejoro ? 'text-green-900' : 'text-amber-900'}`}>
          {mejoro ? 'Vas mejor que el mes pasado' : 'Vas por debajo del mes pasado'}
        </span>
        <span className={`text-sm ${mejoro ? 'text-green-800' : 'text-amber-800'}`}>
          {mejoro ? '+' : ''}
          {bs(diferencia)}
          {variacionPct != null && ` (${variacionPct > 0 ? '+' : ''}${variacionPct.toFixed(0)} %)`}
        </span>
      </div>

      <div className={`text-xs mt-1.5 ${mejoro ? 'text-green-800' : 'text-amber-800'}`}>
        Este mes llevás <strong>{bs(esteMes.gananciaReal)}</strong> de ganancia real. El mes pasado
        cerraste con <strong>{bs(mesPasado.gananciaReal)}</strong>.
      </div>
    </div>
  );
};
