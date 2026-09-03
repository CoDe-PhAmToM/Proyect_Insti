// ============================================================
// VISTA: Recomendaciones v3.0
//
// Reemplaza la pantalla que decía "247 movimientos analizados" y
// recomendaba sobre productos que no existían en los datos.
//
// Regla de esta pantalla: cada recomendación muestra las cifras que
// la originaron. Si dice que hace 94 días que no vendés algo, se
// puede desplegar y ver cuál fue la última venta.
//
// Sobre el nombre: el motor es reglas con umbrales más regresión
// lineal. Eso es analítica prescriptiva y pronóstico estadístico,
// no inteligencia artificial. La pantalla se llama por lo que hace.
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles, TrendingUp, TrendingDown, Target, AlertTriangle, Activity,
  RefreshCw, X, ChevronDown, Loader2, Database,
} from 'lucide-react';
import { api } from '../lib/api';
import { Cargando, ErrorCarga } from '../components/Layout';
import { bs, fechaCorta } from 'shared/formato';

const TIPO = {
  OPORTUNIDAD: { icon: TrendingUp,    label: 'OPORTUNIDAD', bg: 'bg-green-100',  texto: 'text-green-800',  icono: 'text-green-700' },
  PRECIO:      { icon: Target,        label: 'PRECIO',      bg: 'bg-blue-100',   texto: 'text-blue-800',   icono: 'text-blue-700' },
  ALERTA:      { icon: AlertTriangle, label: 'ALERTA',      bg: 'bg-red-100',    texto: 'text-red-800',    icono: 'text-red-700' },
  PRONOSTICO:  { icon: Activity,      label: 'PRONÓSTICO',  bg: 'bg-purple-100', texto: 'text-purple-800', icono: 'text-purple-700' },
};

const SEVERIDAD = {
  CRITICA:     { label: '🔴 URGENTE',       clase: 'bg-red-600 text-white' },
  ADVERTENCIA: { label: '🟡 PRONTO',        clase: 'bg-yellow-400 text-stone-900' },
  INFO:        { label: '🟢 CUANDO PUEDAS', clase: 'bg-green-100 text-green-900' },
};

export const InteligenciaIA = () => {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [recalculando, setRecalculando] = useState(false);
  const [error, setError] = useState(null);

  const cargar = useCallback(async (recalcular = false) => {
    if (recalcular) setRecalculando(true);
    else setCargando(true);
    setError(null);
    try {
      setDatos(await api.get('/recomendaciones', recalcular ? { recalcular: 'true' } : {}));
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
      setRecalculando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const descartar = async (id) => {
    await api.post(`/recomendaciones/${id}/descartar`);
    setDatos((d) => ({ ...d, recomendaciones: d.recomendaciones.filter((r) => r.id !== id) }));
  };

  if (cargando) return <Cargando texto="Analizando tus datos..." />;
  if (error) return <ErrorCarga mensaje={error} onReintentar={() => cargar()} />;

  const { recomendaciones, analizado, sinDatos } = datos;
  const criticas = recomendaciones.filter((r) => r.severidad === 'CRITICA').length;

  return (
    <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">
      {/* Encabezado: dice exactamente sobre qué datos trabajó */}
      <div className="bg-gradient-to-br from-stone-950 via-stone-900 to-orange-950 text-white p-5 sm:p-8 rounded-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-orange-400" />
              <div className="text-[11px] tracking-[0.3em] uppercase text-orange-400">
                Motor de análisis
              </div>
            </div>
            <button
              onClick={() => cargar(true)}
              disabled={recalculando}
              className="flex items-center gap-1.5 border border-stone-700 px-3 py-1.5 text-[11px] font-bold rounded-sm hover:bg-stone-800 disabled:opacity-50"
            >
              {recalculando ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <RefreshCw size={12} />
              )}
              VOLVER A ANALIZAR
            </button>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight max-w-xl leading-tight mb-4">
            {sinDatos
              ? 'Todavía no hay datos para analizar.'
              : recomendaciones.length === 0
                ? 'Está todo en orden por ahora.'
                : `${recomendaciones.length} cosa${recomendaciones.length !== 1 ? 's' : ''} que podés mejorar${criticas > 0 ? `, ${criticas} urgente${criticas !== 1 ? 's' : ''}` : ''}.`}
          </h2>

          <p className="text-sm text-stone-400 max-w-xl leading-relaxed mb-6">
            {sinDatos
              ? 'Empezá anotando tus ventas y gastos. Con los primeros movimientos el sistema ya puede avisarte qué revisar.'
              : 'Cada recomendación sale de tus propios números. Tocá "ver de dónde sale" para ver los datos exactos que la originaron.'}
          </p>

          {/* Lo analizado: verificable, no decorativo */}
          <div className="flex flex-wrap gap-6 text-xs">
            <Dato label="Movimientos analizados" valor={analizado.movimientos} />
            <Dato label="Materiales" valor={analizado.materiales} />
            <Dato label="Prendas" valor={analizado.productos} />
            {analizado.desde && (
              <Dato
                label="Período"
                valor={`${fechaCorta(analizado.desde)} — ${fechaCorta(analizado.hasta)}`}
              />
            )}
          </div>
        </div>
      </div>

      {/* Nota metodológica honesta */}
      {!sinDatos && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-sm text-xs text-blue-900 flex items-start gap-2.5">
          <Database size={15} className="mt-0.5 shrink-0" />
          <div>
            <strong>Cómo funciona:</strong> el sistema revisa tu stock, tus márgenes, la rotación de
            cada prenda y la mezcla de gastos, y proyecta la demanda con el promedio y la tendencia de
            tus ventas. Cuando no hay datos suficientes para afirmar algo, no lo afirma: te dice qué
            le falta.
          </div>
        </div>
      )}

      {recomendaciones.length === 0 && !sinDatos && (
        <div className="bg-white border border-stone-200 rounded-sm p-12 text-center">
          <div className="text-base font-bold text-stone-700 mb-1">Sin alertas por ahora</div>
          <div className="text-sm text-stone-500 max-w-sm mx-auto">
            No se encontró nada que necesite tu atención con los datos que hay cargados.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {recomendaciones.map((r) => (
          <Tarjeta key={r.id} r={r} onDescartar={() => descartar(r.id)} />
        ))}
      </div>
    </div>
  );
};

// ── Tarjeta de recomendación ─────────────────────────────────

const Tarjeta = ({ r, onDescartar }) => {
  const [abierto, setAbierto] = useState(false);
  const cfg = TIPO[r.tipo] ?? TIPO.ALERTA;
  const sev = SEVERIDAD[r.severidad] ?? SEVERIDAD.INFO;
  const Icono = cfg.icon;

  return (
    <div className="bg-white border border-stone-200 rounded-sm hover:border-stone-400 transition-colors flex flex-col">
      <div className="p-6 flex-1 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className={`p-2 rounded-sm ${cfg.bg} shrink-0`}>
            <Icono size={16} className={cfg.icono} />
          </div>
          <div className="flex items-center gap-2 ml-auto flex-wrap justify-end">
            <span
              className={`text-[11px] font-black px-2 py-0.5 rounded-sm ${sev.clase} uppercase tracking-wider`}
            >
              {sev.label}
            </span>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-sm ${cfg.bg} ${cfg.texto} tracking-wider`}
            >
              {cfg.label}
            </span>
            <button
              onClick={onDescartar}
              title="No mostrar más"
              className="text-stone-300 hover:text-stone-600 p-0.5"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1">
          <h3 className="font-black text-base text-stone-900 mb-2 leading-snug">{r.titulo}</h3>
          <p className="text-sm text-stone-600 leading-relaxed">{r.mensaje}</p>
        </div>

        {/* La evidencia: lo que hace que esto no sea una afirmación suelta */}
        <div className="border-t border-stone-100 pt-3">
          <button
            onClick={() => setAbierto((a) => !a)}
            className="flex items-center gap-1 text-xs font-bold text-stone-500 hover:text-stone-900"
          >
            <ChevronDown
              size={13}
              className={`transition-transform ${abierto ? 'rotate-180' : ''}`}
            />
            Ver de dónde sale
          </button>

          {abierto && <Evidencia datos={r.datosJson} />}
        </div>
      </div>
    </div>
  );
};

// ── Evidencia numérica ───────────────────────────────────────

const ETIQUETAS = {
  material: 'Material', codigo: 'Código', stockActual: 'Stock actual',
  stockMinimo: 'Mínimo', unidad: 'Unidad', faltante: 'Falta comprar',
  producto: 'Prenda', sku: 'Código', costoMateriales: 'Materiales',
  manoObra: 'Mano de obra', costoTotal: 'Costo total', precioVenta: 'Precio de venta',
  margenPct: 'Margen', gananciaUnitaria: 'Ganancia por prenda',
  diasSinVender: 'Días sin vender', ultimaVenta: 'Última venta',
  ventasHistoricas: 'Ventas registradas', ingresos: 'Entró', egresos: 'Salió',
  retiros: 'Retirado', resultado: 'Resultado', movimientosAnalizados: 'Movimientos analizados',
  retirado: 'Retirado para la casa', porcentaje: 'Porcentaje de lo que entró',
  gananciaReal: 'Ganancia real', gananciaSinMezcla: 'Ganancia sin la mezcla',
  costosFijosMensuales: 'Gastos fijos por mes', puntoEquilibrio: 'Punto de equilibrio',
  vendidasEsteMes: 'Vendidas este mes', faltan: 'Faltan', margenContribucion: 'Margen de contribución',
  mesesAnalizados: 'Meses analizados', estimadoProximoMes: 'Estimado el mes que viene',
  mediaMovil: 'Promedio de los últimos meses', pendiente: 'Cambio por mes',
  r2: 'Ajuste del modelo (R²)', metodo: 'Método usado',
};

const MONEDA = new Set([
  'costoMateriales', 'manoObra', 'costoTotal', 'precioVenta', 'gananciaUnitaria',
  'ingresos', 'egresos', 'retiros', 'resultado', 'retirado', 'gananciaReal',
  'gananciaSinMezcla', 'costosFijosMensuales', 'margenContribucion',
]);

const Evidencia = ({ datos }) => {
  if (!datos) return null;

  const { serie, ...resto } = datos;

  return (
    <div className="mt-3 bg-stone-50 border border-stone-200 rounded-sm p-3 space-y-3">
      <table className="w-full text-xs">
        <tbody>
          {Object.entries(resto).map(([k, v]) => (
            <tr key={k} className="border-b border-stone-100 last:border-0">
              <td className="py-1.5 text-stone-500">{ETIQUETAS[k] ?? k}</td>
              <td className="py-1.5 text-right font-semibold text-stone-800 tabular-nums">
                {MONEDA.has(k)
                  ? bs(v)
                  : k === 'ultimaVenta'
                    ? fechaCorta(v)
                    : k === 'margenPct' || k === 'porcentaje'
                      ? `${Number(v).toFixed(1)} %`
                      : String(v)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* La serie de ventas que alimentó el pronóstico */}
      {serie?.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wider text-stone-400 mb-1.5">
            Ventas mes a mes
          </div>
          <div className="flex items-end gap-1.5 h-16">
            {serie.map((s) => {
              const max = Math.max(...serie.map((x) => x.unidades), 1);
              return (
                <div key={s.mes} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className="w-full bg-purple-400 rounded-t-sm"
                      style={{ height: `${(s.unidades / max) * 100}%` }}
                      title={`${s.unidades} unidades`}
                    />
                  </div>
                  <div className="text-[11px] text-stone-400">{s.mes.slice(5)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const Dato = ({ label, valor }) => (
  <div>
    <div className="text-[11px] tracking-[0.2em] uppercase text-stone-500 mb-1">{label}</div>
    <div className="font-bold">{valor}</div>
  </div>
);
