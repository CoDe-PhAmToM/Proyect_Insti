// ============================================================
// CONFIRMACIÓN AL GUARDAR
//
// Antes, guardar un movimiento simplemente cerraba el modal. No
// había ningún momento de "listo, quedó".
//
// Suena chico y no lo es: la población del estudio desconfía de los
// sistemas digitales — el documento lo dice — y esa desconfianza se
// alimenta justo de no saber si la acción llegó. Alguien que no ve
// confirmación vuelve a apretar, duplica el registro, o se queda
// con la duda de si anotó o no.
//
// En celular además vibra corto. Es la señal más directa de que el
// sistema recibió lo que hiciste.
// ============================================================

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Check, AlertTriangle, X, Info } from 'lucide-react';

const AvisoContext = createContext(null);

const ICONO = { ok: Check, error: AlertTriangle, info: Info };
const CLASE = {
  ok: 'bg-green-700 text-white',
  error: 'bg-red-700 text-white',
  info: 'bg-stone-900 text-white',
};

export const AvisoProvider = ({ children }) => {
  const [avisos, setAvisos] = useState([]);

  const mostrar = useCallback((texto, tipo = 'ok', ms = 3000) => {
    const id = Date.now() + Math.random();
    setAvisos((a) => [...a, { id, texto, tipo }]);

    // Vibración corta solo para confirmaciones. En un error no
    // corresponde: sería premiar algo que salió mal.
    if (tipo === 'ok' && navigator.vibrate) {
      try {
        navigator.vibrate(35);
      } catch {
        /* algunos navegadores lo bloquean sin gesto previo */
      }
    }

    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), ms);
  }, []);

  const cerrar = (id) => setAvisos((a) => a.filter((x) => x.id !== id));

  return (
    <AvisoContext.Provider value={{ mostrar }}>
      {children}

      {/* Abajo en celular (cerca del pulgar), arriba a la derecha en
          escritorio (fuera del camino de la vista) */}
      <div className="fixed z-[60] bottom-4 left-4 right-4 sm:bottom-auto sm:left-auto sm:top-4 sm:right-4 sm:w-80 flex flex-col gap-2 pointer-events-none">
        {avisos.map((a) => {
          const Icono = ICONO[a.tipo] ?? Check;
          return (
            <div
              key={a.id}
              role="status"
              className={`${CLASE[a.tipo]} rounded-sm shadow-lg px-4 py-3.5 flex items-start gap-2.5 pointer-events-auto animate-[deslizar_.18s_ease-out]`}
            >
              <Icono size={17} className="mt-0.5 shrink-0" />
              <span className="text-sm font-semibold flex-1 leading-snug">{a.texto}</span>
              <button
                onClick={() => cerrar(a.id)}
                className="opacity-60 hover:opacity-100 shrink-0"
                aria-label="Cerrar"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes deslizar {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[deslizar_\\.18s_ease-out\\] { animation: none; }
        }
      `}</style>
    </AvisoContext.Provider>
  );
};

export const useAviso = () => {
  const ctx = useContext(AvisoContext);
  // Devuelve una función vacía si no hay proveedor: un aviso que no
  // se puede mostrar nunca debe romper la pantalla que lo pide.
  return ctx ?? { mostrar: () => {} };
};
