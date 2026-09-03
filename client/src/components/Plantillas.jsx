// ============================================================
// PLANTILLAS DE PRENDAS
//
// El objetivo específico 2 las pide textualmente: "plantillas
// digitales precargadas que faciliten la migración de datos desde
// los apuntes físicos al sistema".
//
// La fricción que resuelven es real: para que el sistema calcule
// cuánto cuesta una prenda hace falta cargar su receta — cuántos
// metros de tela, cuántos conos de hilo. Alguien que recién entra
// no tiene eso escrito, lo tiene en la cabeza. Arrancar de una
// plantilla y corregirla es mucho más fácil que armarla de cero.
// ============================================================

import React, { useState, useEffect } from 'react';
import { Loader2, Check, Sparkles, Package } from 'lucide-react';
import { api } from '../lib/api';
import { Modal, FormField, inputClass } from './Modal';
import { bs } from 'shared/formato';

export const ModalPlantillas = ({ open, onClose, onUsada }) => {
  const [datos, setDatos] = useState(null);
  const [elegida, setElegida] = useState(null);
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [error, setError] = useState(null);
  const [creando, setCreando] = useState(false);
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    if (!open) return;
    setElegida(null);
    setResultado(null);
    setError(null);
    api.get('/plantillas').then(setDatos).catch((e) => setError(e.message));
  }, [open]);

  const usar = async () => {
    setCreando(true);
    setError(null);
    try {
      const r = await api.post(`/plantillas/${elegida.id}/usar`, {
        nombre: nombre.trim() || undefined,
        precioVenta: precio ? Number(precio) : undefined,
      });
      setResultado(r);
      onUsada?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setCreando(false);
    }
  };

  // ── Ya se creó ─────────────────────────────────────────────
  if (resultado) {
    return (
      <Modal open={open} onClose={onClose} title="Prenda creada" subtitulo={resultado.sku}>
        <div className="space-y-4 text-center py-2">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Check size={26} className="text-green-700" />
          </div>
          <p className="text-sm text-stone-600 leading-relaxed">{resultado.mensaje}</p>

          {resultado.materialesCreados?.length > 0 && (
            <div className="bg-stone-50 border border-stone-200 rounded-sm p-3 text-left">
              <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                Materiales agregados
              </div>
              <ul className="text-xs text-stone-600 space-y-0.5">
                {resultado.materialesCreados.map((m) => (
                  <li key={m}>· {m}</li>
                ))}
              </ul>
              <p className="text-[11px] text-stone-500 mt-2">
                Entraron con stock 0 y precio de referencia. Cargá lo que tengas de verdad desde
                Materiales.
              </p>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 bg-stone-900 text-white rounded-sm text-sm font-black hover:bg-stone-800"
          >
            LISTO
          </button>
        </div>
      </Modal>
    );
  }

  // ── Confirmar la elegida ───────────────────────────────────
  if (elegida) {
    return (
      <Modal open={open} onClose={onClose} title={elegida.nombre} subtitulo="Revisá antes de crear">
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-800 text-sm rounded-sm p-3">
              {error}
            </div>
          )}

          <div className="bg-stone-50 border border-stone-200 rounded-sm p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-2">
              Lleva
            </div>
            <table className="w-full text-sm">
              <tbody>
                {elegida.receta.map((r) => (
                  <tr key={r.codigo} className="border-b border-stone-100 last:border-0">
                    <td className="py-1.5 text-stone-600">
                      {datos.plantillas
                        .find((p) => p.id === elegida.id)
                        ?.materialesFaltantes.find((m) => m.codigo === r.codigo)?.nombre ?? r.codigo}
                    </td>
                    <td className="py-1.5 text-right font-semibold tabular-nums">{r.cantidad}</td>
                  </tr>
                ))}
                <tr>
                  <td className="py-1.5 text-stone-600">Mano de obra</td>
                  <td className="py-1.5 text-right font-semibold">{bs(elegida.manoObra)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-sm p-3 text-xs text-amber-900">
            Estas cantidades son consumos típicos del sector, no una verdad. <strong>Ajustalas a tu
            forma de cortar</strong> — cada taller aprovecha la tela distinto, y de eso depende que
            el costo salga bien.
          </div>

          <FormField label="¿Cómo la vas a llamar?">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder={elegida.nombre}
              className={inputClass}
            />
          </FormField>

          <FormField label="¿A cuánto la vendés? (Bs.)">
            <input
              type="number"
              min="0"
              step="0.5"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              placeholder={String(elegida.precioSugerido)}
              className={inputClass}
            />
          </FormField>

          {elegida.materialesFaltantes.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-sm p-3 text-xs text-blue-900">
              Te faltan {elegida.materialesFaltantes.length} material(es) de esta receta. Se van a
              crear en tu inventario con stock 0 para que después cargues lo que tengas.
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setElegida(null)}
              className="flex-1 py-3 border-2 border-stone-200 rounded-sm text-sm font-bold text-stone-600"
            >
              Volver
            </button>
            <button
              onClick={usar}
              disabled={creando}
              className="flex-1 py-3 bg-stone-900 text-white rounded-sm text-sm font-black hover:bg-stone-800 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {creando && <Loader2 size={15} className="animate-spin" />}
              CREAR PRENDA
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // ── Elegir ─────────────────────────────────────────────────
  return (
    <Modal open={open} onClose={onClose} title="Empezá con una plantilla" subtitulo="Prendas típicas" wide>
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-800 text-sm rounded-sm p-3">
            {error}
          </div>
        )}

        {!datos ? (
          <div className="py-8 text-center text-sm text-stone-500">Cargando...</div>
        ) : (
          <>
            <p className="text-sm text-stone-600 leading-relaxed">{datos.aviso}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {datos.plantillas.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setElegida(p);
                    setNombre('');
                    setPrecio('');
                  }}
                  disabled={p.yaLaTiene}
                  className={`text-left p-4 rounded-sm border-2 transition-colors ${
                    p.yaLaTiene
                      ? 'border-stone-100 bg-stone-50 opacity-60 cursor-not-allowed'
                      : 'border-stone-200 hover:border-orange-400'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl shrink-0">{p.emoji}</span>
                    <div className="min-w-0">
                      <div className="font-black text-stone-900 leading-snug">{p.nombre}</div>
                      <div className="text-xs text-stone-500 mt-0.5">{p.descripcion}</div>
                      <div className="text-xs font-bold text-stone-700 mt-1.5">
                        {p.yaLaTiene ? 'Ya la tenés' : `Sugerido: ${bs(p.precioSugerido)}`}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

/** Botón para abrir las plantillas desde Costeo o Materiales. */
export const BotonPlantillas = ({ onUsada }) => {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="flex items-center gap-1.5 border-2 border-stone-300 px-3 py-2.5 text-xs font-bold rounded-sm hover:bg-stone-100"
      >
        <Sparkles size={13} /> USAR PLANTILLA
      </button>
      <ModalPlantillas
        open={abierto}
        onClose={() => setAbierto(false)}
        onUsada={onUsada}
      />
    </>
  );
};
