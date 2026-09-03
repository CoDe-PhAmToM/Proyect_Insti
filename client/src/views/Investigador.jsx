// ============================================================
// VISTA: Panel del equipo investigador
//
// Hasta ahora el rol ADMIN existía y los endpoints estaban, pero no
// había pantalla: al entrar, TODO daba error. No era un descuido de
// diseño — un admin no tiene taller propio, tiene que elegir cuál
// de los talleres del piloto quiere mirar, y esa pantalla faltaba.
//
// Esto no es una funcionalidad para el microempresario. Es el
// instrumento con el que el equipo recolecta los datos que exige el
// capítulo III: línea base, curva de aprendizaje, alertas
// generadas, completitud y la escala SUS.
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2, Download, Loader2, KeyRound, ClipboardList, Gauge, Copy, Check, X, Bug,
} from 'lucide-react';
import { api } from '../lib/api';
import { descargarArchivo } from '../lib/descargar';
import { Modal, FormField, inputClass } from '../components/Modal';
import { Cargando, ErrorCarga, SinDatos } from '../components/Layout';
import { bs, fechaCorta, nombrePeriodo } from 'shared/formato';

const PESTANAS = [
  { id: 'talleres',   label: 'Talleres',     icon: Building2 },
  { id: 'uso',        label: 'Uso',          icon: Gauge },
  { id: 'lineabase',  label: 'Línea base',   icon: ClipboardList },
  { id: 'sus',        label: 'Usabilidad',   icon: Check },
  { id: 'errores',    label: 'Fallas',       icon: Bug },
];

export const Investigador = () => {
  const [pestana, setPestana] = useState('talleres');
  const [resetAbierto, setResetAbierto] = useState(false);

  return (
    <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">
      <div className="bg-stone-950 text-white p-5 sm:p-6 rounded-sm flex flex-wrap gap-4 justify-between items-start">
        <div>
          <div className="text-[11px] tracking-[0.25em] uppercase text-orange-400 mb-1">
            Instrumento de recolección
          </div>
          <h2 className="text-xl font-black tracking-tight">Panel del equipo investigador</h2>
          <p className="text-xs text-stone-400 mt-1 max-w-lg leading-relaxed">
            Desde acá se cargan las líneas base, se siguen los indicadores del piloto y se exportan
            los datos para el análisis estadístico.
          </p>
        </div>
        <button
          onClick={() => setResetAbierto(true)}
          className="flex items-center gap-1.5 border border-stone-700 px-3 py-2 text-[11px] font-bold rounded-sm hover:bg-stone-800 shrink-0"
        >
          <KeyRound size={13} /> DAR CLAVE NUEVA
        </button>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {PESTANAS.map((p) => {
          const Icon = p.icon;
          return (
            <button
              key={p.id}
              onClick={() => setPestana(p.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-sm text-xs font-bold ${
                pestana === p.id
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <Icon size={13} /> {p.label}
            </button>
          );
        })}
      </div>

      {pestana === 'talleres' && <Talleres />}
      {pestana === 'uso' && <IndicadoresUso />}
      {pestana === 'lineabase' && <LineasBase />}
      {pestana === 'sus' && <ResultadosSus />}
      {pestana === 'errores' && <Errores />}

      <ModalReseteo open={resetAbierto} onClose={() => setResetAbierto(false)} />
    </div>
  );
};

// ── Talleres ─────────────────────────────────────────────────

const Talleres = () => {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [bajando, setBajando] = useState(false);

  useEffect(() => {
    api.get('/admin/talleres').then(setDatos).catch((e) => setError(e.message));
  }, []);

  const exportar = async () => {
    setBajando(true);
    try {
      await descargarArchivo('/admin/export', {}, 'piloto-gestione.csv');
    } catch (e) {
      setError(e.message);
    } finally {
      setBajando(false);
    }
  };

  if (error) return <ErrorCarga mensaje={error} />;
  if (!datos) return <Cargando texto="Cargando talleres..." />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <Mini titulo="Talleres" valor={datos.talleres.length} />
        <Mini titulo="En el piloto" valor={datos.enPiloto} color="text-orange-700" />
        <Mini
          titulo="Con línea base"
          valor={datos.talleres.filter((t) => t.tieneLineaBase).length}
          color={
            datos.talleres.filter((t) => t.tieneLineaBase).length < datos.enPiloto
              ? 'text-red-700'
              : 'text-green-700'
          }
        />
      </div>

      {/* El aviso que más importa del piloto entero */}
      {datos.talleres.some((t) => t.enPiloto && !t.tieneLineaBase) && (
        <div className="bg-red-50 border-2 border-red-300 rounded-sm p-4 text-sm text-red-900">
          <strong>Falta línea base en talleres del piloto.</strong> Sin ese punto de partida no hay
          contra qué comparar, y esos talleres quedan fuera del objetivo específico 5. La línea base
          se carga <em>antes</em> de que el taller empiece a usar el sistema — después ya no se puede
          reconstruir.
        </div>
      )}

      <div className="bg-white border border-stone-200 rounded-sm overflow-hidden">
        <div className="p-5 border-b border-stone-200 flex flex-wrap gap-3 justify-between items-center">
          <h3 className="font-black tracking-tight">Talleres registrados</h3>
          <button
            onClick={exportar}
            disabled={bajando}
            className="flex items-center gap-1.5 border border-stone-300 px-3 py-2 text-xs font-bold rounded-sm hover:bg-stone-100 disabled:opacity-50"
          >
            {bajando ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            EXPORTAR CSV
          </button>
        </div>

        {datos.talleres.length === 0 ? (
          <SinDatos titulo="Todavía no hay talleres" texto="Se registran desde la pantalla de acceso." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[40rem]">
              <thead className="bg-stone-50">
                <tr className="text-left text-[11px] uppercase tracking-wider text-stone-500">
                  <th className="px-5 py-3 font-medium">Taller</th>
                  <th className="px-5 py-3 font-medium">Dueño</th>
                  <th className="px-5 py-3 font-medium text-center">Piloto</th>
                  <th className="px-5 py-3 font-medium text-right">Movimientos</th>
                  <th className="px-5 py-3 font-medium text-right">Órdenes</th>
                  <th className="px-5 py-3 font-medium text-center">Línea base</th>
                </tr>
              </thead>
              <tbody>
                {datos.talleres.map((t) => (
                  <tr key={t.id} className="border-b border-stone-100">
                    <td className="px-5 py-3 font-semibold">{t.nombre}</td>
                    <td className="px-5 py-3 text-stone-600">{t.propietario}</td>
                    <td className="px-5 py-3 text-center">
                      {t.enPiloto && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-sm bg-orange-100 text-orange-800">
                          SÍ
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">{t.movimientos}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{t.ordenes}</td>
                    <td className="px-5 py-3 text-center">
                      {t.tieneLineaBase ? (
                        <Check size={15} className="text-green-700 inline" />
                      ) : (
                        <X size={15} className="text-red-500 inline" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[11px] text-stone-500 leading-relaxed">
        El CSV sale <strong>anonimizado</strong>: los talleres aparecen como T01, T02, T03. Trae una
        fila por taller y período, con la columna <code>momento</code> en <code>pre</code> o{' '}
        <code>post</code>, lista para correr Wilcoxon en SPSS o R.
      </p>
    </div>
  );
};

// ── Indicadores de uso ───────────────────────────────────────

const IndicadoresUso = () => {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/admin/indicadores-uso').then(setDatos).catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorCarga mensaje={error} />;
  if (!datos) return <Cargando texto="Calculando indicadores..." />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <Mini titulo="Movimientos" valor={datos.totalRegistros} />
        <Mini titulo="Alertas generadas" valor={datos.totalAlertas} />
        <Mini titulo="Completitud" valor={`${datos.completitudPct} %`} />
      </div>

      {datos.aviso && (
        <div className="bg-blue-50 border border-blue-200 rounded-sm p-4 text-sm text-blue-900">
          {datos.aviso}
        </div>
      )}

      <div className="bg-white border border-stone-200 rounded-sm overflow-hidden">
        <div className="p-5 border-b border-stone-200">
          <h3 className="font-black tracking-tight">Curva de aprendizaje</h3>
          <p className="text-xs text-stone-500 mt-1">
            Tiempo promedio en cargar un movimiento. Es el indicador de la tabla de operativización:
            semana 1 contra semana 3.
          </p>
        </div>

        {datos.curvaAprendizaje.length === 0 ? (
          <SinDatos
            titulo="Todavía no hay datos de uso"
            texto="Se acumulan solos a medida que los talleres van cargando movimientos."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[30rem]">
              <thead className="bg-stone-50">
                <tr className="text-left text-[11px] uppercase tracking-wider text-stone-500">
                  <th className="px-5 py-3 font-medium">Taller</th>
                  <th className="px-5 py-3 font-medium text-right">Semana 1</th>
                  <th className="px-5 py-3 font-medium text-right">Semana 3</th>
                  <th className="px-5 py-3 font-medium text-right">Mejora</th>
                  <th className="px-5 py-3 font-medium text-right">Registros</th>
                </tr>
              </thead>
              <tbody>
                {datos.curvaAprendizaje.map((c) => {
                  const mejora =
                    c.segundosSemana1 && c.segundosSemana3
                      ? Math.round(((c.segundosSemana1 - c.segundosSemana3) / c.segundosSemana1) * 100)
                      : null;
                  return (
                    <tr key={c.tallerId} className="border-b border-stone-100">
                      <td className="px-5 py-3 font-mono text-xs text-stone-500">
                        {c.tallerId.slice(0, 8)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {c.segundosSemana1 != null ? `${c.segundosSemana1} s` : '—'}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {c.segundosSemana3 != null ? `${c.segundosSemana3} s` : '—'}
                      </td>
                      <td
                        className={`px-5 py-3 text-right font-bold tabular-nums ${
                          mejora > 0 ? 'text-green-700' : mejora < 0 ? 'text-red-700' : 'text-stone-400'
                        }`}
                      >
                        {mejora != null ? `${mejora > 0 ? '−' : '+'}${Math.abs(mejora)} %` : '—'}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-stone-500">
                        {c.totalRegistros}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {datos.alertasPorTipo.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-sm p-5">
          <h3 className="font-black tracking-tight mb-3">Alertas automáticas por tipo</h3>
          <table className="w-full text-sm">
            <tbody>
              {datos.alertasPorTipo.map((a, i) => (
                <tr key={i} className="border-b border-stone-100 last:border-0">
                  <td className="py-2 text-stone-600">{a.tipo.replace(/_/g, ' ')}</td>
                  <td className="py-2 text-right font-bold tabular-nums">{a.cantidad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Línea base ───────────────────────────────────────────────

const LineasBase = () => {
  const [talleres, setTalleres] = useState([]);
  const [tallerId, setTallerId] = useState('');
  const [datos, setDatos] = useState(null);
  const [modal, setModal] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/admin/talleres').then((d) => {
      setTalleres(d.talleres);
      setTallerId(d.talleres.find((t) => t.enPiloto)?.id ?? d.talleres[0]?.id ?? '');
    });
  }, []);

  const cargar = useCallback(async () => {
    if (!tallerId) return;
    try {
      setDatos(await api.get('/linea-base', { tallerId }));
    } catch (e) {
      setError(e.message);
    }
  }, [tallerId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-stone-200 rounded-sm p-5">
        <FormField label="¿De qué taller?">
          <select
            value={tallerId}
            onChange={(e) => setTallerId(e.target.value)}
            className={inputClass}
          >
            {talleres.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre} {t.enPiloto ? '· en el piloto' : ''}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      {error && <ErrorCarga mensaje={error} onReintentar={cargar} />}

      {datos && (
        <div className="bg-white border border-stone-200 rounded-sm overflow-hidden">
          <div className="p-5 border-b border-stone-200 flex flex-wrap gap-3 justify-between items-center">
            <div>
              <h3 className="font-black tracking-tight">Línea base del cuaderno</h3>
              <p className="text-xs text-stone-500 mt-1">
                Lo que el microempresario declaraba ganar y gastar antes de usar el sistema.
              </p>
            </div>
            <button
              onClick={() => setModal(true)}
              className="bg-stone-900 text-white px-4 py-2.5 text-xs font-black rounded-sm hover:bg-stone-800"
            >
              + CARGAR PERÍODO
            </button>
          </div>

          {datos.lineasBase.length === 0 ? (
            <SinDatos titulo="Sin línea base cargada" texto={datos.aviso} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[36rem]">
                <thead className="bg-stone-50">
                  <tr className="text-left text-[11px] uppercase tracking-wider text-stone-500">
                    <th className="px-5 py-3 font-medium">Período</th>
                    <th className="px-5 py-3 font-medium text-right">Ingresos</th>
                    <th className="px-5 py-3 font-medium text-right">Egresos</th>
                    <th className="px-5 py-3 font-medium text-right">Retiros</th>
                    <th className="px-5 py-3 font-medium text-right">Ganancia</th>
                    <th className="px-5 py-3 font-medium text-right">CIF</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.lineasBase.map((l) => (
                    <tr key={l.id} className="border-b border-stone-100">
                      <td className="px-5 py-3 font-semibold">{nombrePeriodo(l.periodo)}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-green-700">
                        {bs(l.ingresosDeclarados, { simbolo: false })}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-red-600">
                        {bs(l.egresosDeclarados, { simbolo: false })}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-amber-700">
                        {bs(l.retirosDeclarados, { simbolo: false })}
                      </td>
                      <td className="px-5 py-3 text-right font-bold tabular-nums">
                        {bs(
                          l.ingresosDeclarados - l.egresosDeclarados - l.retirosDeclarados,
                          { simbolo: false }
                        )}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-stone-500">
                        {l.cifIdentificados}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ModalLineaBase
        open={modal}
        onClose={() => setModal(false)}
        tallerId={tallerId}
        onGuardado={() => {
          setModal(false);
          cargar();
        }}
      />
    </div>
  );
};

const ModalLineaBase = ({ open, onClose, tallerId, onGuardado }) => {
  const vacio = {
    periodo: '', ingresosDeclarados: '', egresosDeclarados: '', retirosDeclarados: '',
    costoUnitarioEstimado: '', margenConocidoPct: '', cifIdentificados: '0', notas: '',
  };
  const [form, setForm] = useState(vacio);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(vacio);
      setError(null);
    }
  }, [open]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      await api.post(`/linea-base?tallerId=${tallerId}`, {
        periodo: form.periodo,
        ingresosDeclarados: Number(form.ingresosDeclarados || 0),
        egresosDeclarados: Number(form.egresosDeclarados || 0),
        retirosDeclarados: Number(form.retirosDeclarados || 0),
        costoUnitarioEstimado: form.costoUnitarioEstimado ? Number(form.costoUnitarioEstimado) : null,
        margenConocidoPct: form.margenConocidoPct ? Number(form.margenConocidoPct) : null,
        cifIdentificados: Number(form.cifIdentificados || 0),
        notas: form.notas || null,
      });
      onGuardado();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Cargar línea base" subtitulo="Datos del cuaderno" wide>
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-800 text-sm rounded-sm p-3">
            {error}
          </div>
        )}

        <div className="bg-stone-50 border border-stone-200 rounded-sm p-3 text-xs text-stone-600">
          Estos números salen de la entrevista y de revisar el cuaderno del microempresario, no del
          sistema. Es el punto de partida contra el que se va a medir el cambio.
        </div>

        <FormField label="Mes (formato 2026-03)">
          <input value={form.periodo} onChange={set('periodo')} placeholder="2026-03" className={inputClass} />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Declaraba ganar (Bs.)">
            <input type="number" min="0" value={form.ingresosDeclarados} onChange={set('ingresosDeclarados')} className={inputClass} />
          </FormField>
          <FormField label="Declaraba gastar (Bs.)">
            <input type="number" min="0" value={form.egresosDeclarados} onChange={set('egresosDeclarados')} className={inputClass} />
          </FormField>
          <FormField label="Sacaba para la casa (Bs.)">
            <input type="number" min="0" value={form.retirosDeclarados} onChange={set('retirosDeclarados')} className={inputClass} />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Costo por prenda que estimaba">
            <input type="number" min="0" step="0.01" value={form.costoUnitarioEstimado} onChange={set('costoUnitarioEstimado')} className={inputClass} />
          </FormField>
          <FormField label="% de prendas con margen conocido">
            <input type="number" min="0" max="100" value={form.margenConocidoPct} onChange={set('margenConocidoPct')} className={inputClass} />
          </FormField>
          <FormField label="Costos indirectos que identificaba">
            <input type="number" min="0" value={form.cifIdentificados} onChange={set('cifIdentificados')} className={inputClass} />
          </FormField>
        </div>

        <FormField label="Notas de la entrevista">
          <input value={form.notas} onChange={set('notas')} placeholder="Anotaba solo las ventas grandes" className={inputClass} />
        </FormField>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border-2 border-stone-200 rounded-sm text-sm font-bold text-stone-600">
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando || !form.periodo}
            className="flex-1 py-3 bg-stone-900 text-white rounded-sm text-sm font-black hover:bg-stone-800 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {guardando && <Loader2 size={15} className="animate-spin" />}
            GUARDAR
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ── Resultados SUS ───────────────────────────────────────────

const ResultadosSus = () => {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/sus/resultados').then(setDatos).catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorCarga mensaje={error} />;
  if (!datos) return <Cargando texto="Cargando resultados..." />;

  if (datos.n === 0) {
    return (
      <div className="bg-white border border-stone-200 rounded-sm">
        <SinDatos titulo="Todavía nadie respondió el SUS" texto={datos.aviso} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-stone-950 text-white p-6 rounded-sm">
        <div className="text-[11px] tracking-[0.2em] uppercase text-stone-400 mb-1">
          Puntaje SUS promedio
        </div>
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="text-4xl font-black text-orange-400 tabular-nums">{datos.promedio}</span>
          <span className="text-lg font-bold">{datos.interpretacion.letra}</span>
          <span className="text-sm text-stone-400">
            usabilidad {datos.interpretacion.adjetivo}
          </span>
        </div>
        <p className="text-xs text-stone-400 mt-2">
          {datos.interpretacion.percentil} · n = {datos.n}
          {datos.desviacion != null && ` · desviación ${datos.desviacion}`}
          {` · mediana ${datos.mediana}`}
        </p>
        <p className="text-[11px] text-stone-500 mt-3 leading-relaxed">
          El puntaje SUS va de 0 a 100 pero <strong>no es un porcentaje</strong>: 68 es el promedio
          de la industria, no un aprobado raspando.
        </p>
      </div>

      {datos.aviso && (
        <div className="bg-amber-50 border border-amber-200 rounded-sm p-4 text-sm text-amber-900">
          {datos.aviso}
        </div>
      )}

      <div className="bg-white border border-stone-200 rounded-sm overflow-hidden">
        <div className="p-5 border-b border-stone-200">
          <h3 className="font-black tracking-tight">Promedio por pregunta</h3>
          <p className="text-xs text-stone-500 mt-1">
            Señala <em>cuál</em> es el problema, no solo que hay uno. En las preguntas invertidas, un
            promedio alto es una alarma.
          </p>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {datos.porItem.map((i) => {
              const malo = i.invertido ? i.promedio >= 3.5 : i.promedio <= 2.5;
              return (
                <tr key={i.n} className="border-b border-stone-100 last:border-0">
                  <td className="px-5 py-2.5 text-stone-400 font-mono text-xs w-8">{i.n}</td>
                  <td className="px-2 py-2.5 text-stone-700">
                    {i.texto}
                    {i.invertido && (
                      <span className="ml-2 text-[10px] text-stone-400 uppercase tracking-wider">
                        invertida
                      </span>
                    )}
                  </td>
                  <td
                    className={`px-5 py-2.5 text-right font-bold tabular-nums ${
                      malo ? 'text-red-700' : 'text-stone-800'
                    }`}
                  >
                    {i.promedio}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {datos.respuestas.some((r) => r.comentario) && (
        <div className="bg-white border border-stone-200 rounded-sm p-5 space-y-3">
          <h3 className="font-black tracking-tight">Comentarios</h3>
          {datos.respuestas
            .filter((r) => r.comentario)
            .map((r) => (
              <div key={r.id} className="border-l-2 border-stone-200 pl-3 text-sm text-stone-600">
                <div className="italic">"{r.comentario}"</div>
                <div className="text-[11px] text-stone-400 mt-0.5">
                  {r.taller ?? 'sin taller'} · puntaje {r.puntaje}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

// ── Fallas en producción ─────────────────────────────────────
//
// Sin esta pantalla, si algo falla en el celular de una
// microempresaria el equipo no se entera nunca. Ella cree que hizo
// algo mal, deja de usar el sistema, y el piloto pierde un caso.

const Errores = () => {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [marcando, setMarcando] = useState(null);

  const cargar = useCallback(() => {
    api.get('/errores').then(setDatos).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const resolver = async (ids) => {
    setMarcando(ids[0]);
    try {
      await api.post('/errores/resolver', { ids });
      cargar();
    } finally {
      setMarcando(null);
    }
  };

  if (error) return <ErrorCarga mensaje={error} onReintentar={cargar} />;
  if (!datos) return <Cargando texto="Buscando fallas..." />;

  if (datos.total === 0) {
    return (
      <div className="bg-white border border-stone-200 rounded-sm">
        <SinDatos
          titulo="Sin fallas registradas"
          texto="Buena señal. Acá van a aparecer los errores que le pasen a cualquier usuario, para que el equipo se entere sin depender de que alguien avise."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border-2 border-amber-200 rounded-sm p-4 text-sm text-amber-900">
        <strong>{datos.total} falla(s) sin revisar.</strong> Están agrupadas por mensaje: 40 veces
        el mismo error es UN problema, no 40.
      </div>

      <div className="space-y-3">
        {datos.agrupados.map((g) => (
          <div key={g.mensaje} className="bg-white border border-stone-200 rounded-sm p-5">
            <div className="flex flex-wrap gap-3 justify-between items-start">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-black px-2 py-0.5 rounded-sm bg-red-100 text-red-800">
                    {g.veces} {g.veces === 1 ? 'vez' : 'veces'}
                  </span>
                  <span className="text-[11px] text-stone-500">
                    último: {fechaCorta(g.ultimo)}
                  </span>
                </div>
                <div className="font-mono text-sm text-stone-800 break-all">{g.mensaje}</div>
                {g.rutas.length > 0 && (
                  <div className="text-[11px] text-stone-500 mt-1">
                    En: {g.rutas.join(', ')}
                  </div>
                )}
              </div>

              <button
                onClick={() => resolver(g.ids)}
                disabled={marcando === g.ids[0]}
                className="flex items-center gap-1.5 border border-stone-300 px-3 py-2 text-xs font-bold rounded-sm hover:bg-stone-100 shrink-0 disabled:opacity-50"
              >
                {marcando === g.ids[0] ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Check size={13} />
                )}
                YA ESTÁ
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Modal: emitir clave nueva ────────────────────────────────

const ModalReseteo = ({ open, onClose }) => {
  const [email, setEmail] = useState('');
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail('');
      setResultado(null);
      setError(null);
    }
  }, [open]);

  const emitir = async () => {
    setEnviando(true);
    setError(null);
    try {
      setResultado(await api.post('/reseteo/emitir', { email }));
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Dar una clave nueva" subtitulo="Recuperación asistida">
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-800 text-sm rounded-sm p-3">
            {error}
          </div>
        )}

        {!resultado ? (
          <>
            <div className="bg-stone-50 border border-stone-200 rounded-sm p-3 text-xs text-stone-600">
              Se genera un código de 6 números que dura 30 minutos. Se lo dictás por teléfono y con
              eso la persona pone su contraseña nueva. No se manda por correo: muchos no tienen uno
              activo.
            </div>

            <FormField label="Correo de la persona">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="maria@taller.bo"
                className={inputClass}
                autoCapitalize="none"
              />
            </FormField>

            <button
              onClick={emitir}
              disabled={enviando || !email}
              className="w-full py-3 bg-stone-900 text-white rounded-sm text-sm font-black hover:bg-stone-800 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {enviando && <Loader2 size={15} className="animate-spin" />}
              GENERAR CÓDIGO
            </button>
          </>
        ) : (
          <div className="space-y-4">
            <div className="bg-stone-950 text-white p-6 rounded-sm text-center">
              <div className="text-[11px] tracking-[0.2em] uppercase text-stone-400 mb-2">
                Dictale este código
              </div>
              <div className="text-4xl font-black text-orange-400 tracking-[0.2em] tabular-nums">
                {resultado.codigo}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(resultado.codigo);
                  setCopiado(true);
                  setTimeout(() => setCopiado(false), 2000);
                }}
                className="mt-3 flex items-center gap-1.5 mx-auto text-[11px] font-bold text-stone-400 hover:text-white"
              >
                {copiado ? <Check size={12} /> : <Copy size={12} />}
                {copiado ? 'COPIADO' : 'COPIAR'}
              </button>
            </div>

            <div className="text-sm text-stone-600">
              <div className="font-bold text-stone-900">{resultado.para.nombre}</div>
              <div>{resultado.para.email}</div>
              {resultado.para.telefono && <div>Tel: {resultado.para.telefono}</div>}
            </div>

            <p className="text-xs text-stone-500">{resultado.mensaje}</p>

            <button
              onClick={onClose}
              className="w-full py-3 border-2 border-stone-200 rounded-sm text-sm font-bold text-stone-600"
            >
              Listo
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};

const Mini = ({ titulo, valor, color = 'text-stone-900' }) => (
  <div className="bg-white border border-stone-200 p-4 rounded-sm">
    <div className="text-[11px] tracking-[0.15em] uppercase text-stone-500 mb-1">{titulo}</div>
    <div className={`text-2xl font-black ${color}`}>{valor}</div>
  </div>
);
