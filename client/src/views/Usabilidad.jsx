// ============================================================
// VISTA: Cuestionario de usabilidad (escala SUS)
//
// El documento la promete como instrumento de la Fase II —
// "escala de usabilidad SUS, administrada al final de la prueba
// piloto" — y hasta ahora no existía en ningún lado.
//
// Dos decisiones de diseño que importan para que el dato sirva:
//
// 1. Las preguntas están traducidas al castellano llano del resto
//    del sistema. El SUS original habla de "cumbersome" y de un
//    "technical support person", que no significan nada para una
//    confeccionista.
//
// 2. Al participante NO se le muestra su puntaje. No es una nota
//    que se sacó, y verlo podría condicionar lo que le cuente a
//    otro taller del piloto.
// ============================================================

import React, { useState, useEffect } from 'react';
import { Check, Loader2, MessageSquare } from 'lucide-react';
import { api } from '../lib/api';
import { Cargando, ErrorCarga } from '../components/Layout';

export const Usabilidad = () => {
  const [datos, setDatos] = useState(null);
  const [respuestas, setRespuestas] = useState({});
  const [comentario, setComentario] = useState('');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    api
      .get('/sus/cuestionario')
      .then((d) => {
        setDatos(d);
        setListo(d.yaRespondio);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorCarga mensaje={error} />;
  if (!datos) return <Cargando texto="Cargando el cuestionario..." />;

  if (listo) {
    return (
      <div className="p-4 sm:p-8">
        <div className="max-w-lg mx-auto bg-white border border-stone-200 rounded-sm p-8 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={26} className="text-green-700" />
          </div>
          <h2 className="font-black text-lg text-stone-900 mb-2">Ya respondiste. Gracias.</h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            Tus respuestas ayudan a que el sistema mejore para todos los talleres.
          </p>
        </div>
      </div>
    );
  }

  const faltan = datos.items.filter((i) => !respuestas[i.n]).length;

  const enviar = async () => {
    setEnviando(true);
    setError(null);
    try {
      await api.post('/sus', {
        respuestas: datos.items.map((i) => respuestas[i.n]),
        comentario: comentario.trim() || null,
      });
      setListo(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="p-4 sm:p-8">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="bg-stone-950 text-white p-5 sm:p-6 rounded-sm">
          <div className="text-[11px] tracking-[0.25em] uppercase text-orange-400 mb-1">
            10 preguntas · 3 minutos
          </div>
          <h2 className="text-xl font-black tracking-tight">¿Cómo te resultó usar el sistema?</h2>
          <p className="text-xs text-stone-400 mt-2 leading-relaxed">
            No hay respuestas buenas ni malas, y esto no es un examen. Contestá lo que de verdad
            sentiste usándolo — si algo te resultó difícil, decirlo ayuda más que ser amable.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-800 text-sm rounded-sm p-4">
            {error}
          </div>
        )}

        {datos.items.map((item) => (
          <div key={item.n} className="bg-white border border-stone-200 rounded-sm p-5">
            <div className="flex gap-3 mb-4">
              <span className="text-stone-400 font-mono text-xs pt-0.5 shrink-0">{item.n}</span>
              <p className="font-semibold text-stone-900 leading-snug">{item.texto}</p>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {datos.escala.map((e) => (
                <button
                  key={e.valor}
                  onClick={() => setRespuestas((r) => ({ ...r, [item.n]: e.valor }))}
                  className={`py-3 px-1 rounded-sm border-2 text-center transition-colors ${
                    respuestas[item.n] === e.valor
                      ? 'bg-orange-500 border-orange-500 text-stone-950'
                      : 'border-stone-200 hover:border-stone-400'
                  }`}
                >
                  <div className="font-black text-base">{e.valor}</div>
                  <div className="text-[10px] leading-tight mt-0.5 opacity-80">{e.etiqueta}</div>
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="bg-white border border-stone-200 rounded-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare size={15} className="text-stone-500" />
            <span className="font-semibold text-stone-900">
              ¿Querés contarnos algo más? (opcional)
            </span>
          </div>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={3}
            placeholder="Lo que más me costó fue..."
            className="w-full px-4 py-3 border-2 border-stone-300 rounded-sm text-base focus:outline-none focus:border-orange-500 resize-none"
          />
        </div>

        <button
          onClick={enviar}
          disabled={faltan > 0 || enviando}
          className="w-full py-4 bg-stone-900 text-white rounded-sm font-black text-sm hover:bg-stone-800 disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {enviando && <Loader2 size={16} className="animate-spin" />}
          {faltan > 0 ? `TE FALTAN ${faltan} PREGUNTA${faltan !== 1 ? 'S' : ''}` : 'ENVIAR RESPUESTAS'}
        </button>
      </div>
    </div>
  );
};
