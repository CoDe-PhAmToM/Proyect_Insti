// ============================================================
// VISTA: Reportes contables v3.0
//
// Los cinco reportes se calculan en el SERVIDOR. Antes cada vista
// sumaba por su cuenta y dos pantallas podían mostrar números
// distintos del mismo período — inadmisible en un sistema contable.
//
// El comparativo antes/después es el objetivo específico 5: es el
// reporte con el que se escribe el capítulo de resultados.
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, FileSpreadsheet, Download, Lock, TrendingUp, TrendingDown,
  Package, Shirt, Wallet, Landmark, Scale, GitCompare, Loader2, AlertTriangle,
} from 'lucide-react';
import { api } from '../lib/api';
import { descargarArchivo } from '../lib/descargar';
import { Cargando, ErrorCarga } from '../components/Layout';
import { bs, fechaCorta, nombrePeriodo } from 'shared/formato';

// Las 7 familias suman las 80 plantillas que definió Contaduría.
const CATEGORIAS = [
  { id: 'comparativo',       nombre: 'Comparativo Antes/Después', familia: 'Validación',  plantillas: 0,  icon: GitCompare,   disponible: true,  destacado: true },
  { id: 'estado-resultados', nombre: 'Estado de Resultados',      familia: 'Contable',    plantillas: 12, icon: TrendingUp,   disponible: true },
  { id: 'flujo-caja',        nombre: 'Flujo de Caja',             familia: 'Contable',    plantillas: 10, icon: Wallet,       disponible: true },
  { id: 'kardex',            nombre: 'Kardex de Materiales',      familia: 'Inventario',  plantillas: 15, icon: Package,      disponible: true },
  { id: 'costeo',            nombre: 'Costeo de Productos',       familia: 'Producción',  plantillas: 18, icon: Shirt,        disponible: true },
  { id: 'ventas-periodo',    nombre: 'Ventas por Período',        familia: 'Comercial',   plantillas: 9,  icon: TrendingDown, disponible: false },
  { id: 'balance-general',   nombre: 'Balance General',           familia: 'Contable',    plantillas: 8,  icon: Scale,        disponible: false },
  { id: 'tributario-sin',    nombre: 'Reportes Tributarios (SIN)',familia: 'Legal',       plantillas: 8,  icon: Landmark,     disponible: false },
];

const TOTAL_PLANTILLAS = CATEGORIAS.reduce((a, c) => a + c.plantillas, 0);

const periodoActual = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const Reportes = () => {
  const [categoriaId, setCategoriaId] = useState('comparativo');
  const [periodo, setPeriodo] = useState(periodoActual());
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [bajando, setBajando] = useState(null);
  const [errorDescarga, setErrorDescarga] = useState(null);

  const categoria = CATEGORIAS.find((c) => c.id === categoriaId);

  const cargar = useCallback(async () => {
    if (!categoria?.disponible) return setDatos(null);

    // Se limpia ANTES de pedir. Sin esto, al cambiar de reporte React
    // vuelve a pintar con el categoriaId nuevo pero los datos del
    // reporte anterior — que tienen otra forma — y la pantalla se
    // cae en blanco. Fue un error real, no una precaución teórica.
    setDatos(null);
    setCargando(true);
    setError(null);
    try {
      setDatos(await api.get(`/reportes/${categoriaId}`, { periodo }));
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [categoriaId, periodo, categoria]);

  useEffect(() => {
    let vigente = true;
    // Si el usuario cambia de reporte rápido, la respuesta lenta de
    // la petición vieja no debe pisar a la nueva.
    (async () => {
      await cargar();
      if (!vigente) setDatos(null);
    })();
    return () => {
      vigente = false;
    };
  }, [cargar]);

  const exportar = async (formato) => {
    setBajando(formato);
    setErrorDescarga(null);
    try {
      await descargarArchivo(`/reportes/${categoriaId}/export`, { formato, periodo });
    } catch (e) {
      setErrorDescarga(e.message);
    } finally {
      setBajando(null);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">
      <div className="bg-stone-950 text-white p-5 sm:p-6 rounded-sm flex flex-wrap gap-4 justify-between items-start">
        <div>
          <div className="text-[11px] tracking-[0.25em] uppercase text-orange-400 mb-1">
            Equipo de Contaduría
          </div>
          <h2 className="text-xl font-black tracking-tight">
            {TOTAL_PLANTILLAS} plantillas contables definidas
          </h2>
          <p className="text-xs text-stone-400 mt-1 max-w-lg">
            Agrupadas en {CATEGORIAS.length - 1} familias. Las que tienen datos conectados se calculan
            en vivo y se pueden bajar en PDF o Excel.
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-3xl font-black text-orange-400">
            {CATEGORIAS.filter((c) => c.disponible && c.plantillas > 0).length}/
            {CATEGORIAS.filter((c) => c.plantillas > 0).length}
          </div>
          <div className="text-[11px] text-stone-500 uppercase tracking-wider">
            familias conectadas
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[16rem_1fr] gap-6">
        {/* Lista de reportes */}
        <div className="space-y-1.5">
          {CATEGORIAS.map((c) => {
            const Icon = c.icon;
            const activo = categoriaId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setCategoriaId(c.id)}
                className={`w-full flex items-start gap-3 p-3 rounded-sm text-left transition-colors border ${
                  activo
                    ? 'bg-stone-900 text-white border-stone-900'
                    : c.destacado
                      ? 'bg-orange-50 border-orange-200 hover:border-orange-400'
                      : 'bg-white border-stone-200 hover:border-stone-400'
                }`}
              >
                <Icon size={16} className={`mt-0.5 shrink-0 ${activo ? 'text-orange-400' : ''}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold leading-tight">{c.nombre}</div>
                  <div className={`text-[11px] mt-0.5 ${activo ? 'text-stone-400' : 'text-stone-500'}`}>
                    {c.plantillas > 0 ? `${c.familia} · ${c.plantillas} plantillas` : 'Validación del piloto'}
                  </div>
                </div>
                {!c.disponible && <Lock size={12} className="text-stone-400 mt-1 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Contenido */}
        <div className="bg-white border border-stone-200 rounded-sm">
          <div className="p-5 border-b border-stone-200 flex flex-wrap gap-3 justify-between items-center">
            <div>
              <div className="text-[11px] tracking-[0.2em] uppercase text-stone-500 mb-1">
                {categoria.familia}
              </div>
              <h3 className="text-xl font-black tracking-tight">{categoria.nombre}</h3>
            </div>

            {categoria.disponible && (
              <div className="flex items-center gap-2 flex-wrap">
                {categoriaId !== 'comparativo' && categoriaId !== 'kardex' && categoriaId !== 'costeo' && (
                  <input
                    type="month"
                    value={periodo}
                    onChange={(e) => setPeriodo(e.target.value)}
                    className="px-3 py-2 border border-stone-300 rounded-sm text-sm"
                  />
                )}
                <BotonExport
                  onClick={() => exportar('pdf')}
                  cargando={bajando === 'pdf'}
                  icono={FileText}
                  texto="PDF"
                />
                <BotonExport
                  onClick={() => exportar('xlsx')}
                  cargando={bajando === 'xlsx'}
                  icono={FileSpreadsheet}
                  texto="EXCEL"
                />
              </div>
            )}
          </div>

          <div className="p-6">
            {errorDescarga && (
              <div className="mb-4 bg-red-50 border-2 border-red-200 text-red-800 text-sm rounded-sm p-3">
                {errorDescarga}
              </div>
            )}

            {!categoria.disponible && <NoDisponible categoria={categoria} />}
            {categoria.disponible && cargando && <Cargando texto="Calculando el reporte..." />}
            {categoria.disponible && error && <ErrorCarga mensaje={error} onReintentar={cargar} />}
            {/* datos.tipo === categoriaId es el segundo candado: solo
                se pinta si los datos son de ESTE reporte, no de otro. */}
            {categoria.disponible && datos && datos.tipo === categoriaId && !cargando && (
              <>
                {categoriaId === 'comparativo' && <Comparativo d={datos} />}
                {categoriaId === 'estado-resultados' && <EstadoResultados d={datos} />}
                {categoriaId === 'flujo-caja' && <FlujoCaja d={datos} />}
                {categoriaId === 'kardex' && <Kardex d={datos} />}
                {categoriaId === 'costeo' && <Costeo d={datos} />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Comparativo: el objetivo 5 ───────────────────────────────

const Comparativo = ({ d }) => {
  if (!d.hayLineaBase) {
    return (
      <div className="text-center py-8">
        <AlertTriangle size={28} className="text-amber-500 mx-auto mb-4" />
        <h4 className="font-black text-stone-900 mb-2">Falta la línea base</h4>
        <p className="text-sm text-stone-600 max-w-md mx-auto leading-relaxed">{d.aviso}</p>
      </div>
    );
  }

  const i = d.indicadores;
  const filas = [
    {
      nombre: 'Ganancia mensual promedio',
      antes: bs(i.gananciaMensual.antes),
      despues: bs(i.gananciaMensual.despues),
      dif: i.gananciaMensual.diferencia,
      difTexto: `${i.gananciaMensual.diferencia >= 0 ? '+' : ''}${bs(i.gananciaMensual.diferencia)}`,
    },
    {
      nombre: 'Ventas de las que conoce el margen',
      antes: `${i.margenConocido.antes.toFixed(0)} %`,
      despues: `${i.margenConocido.despues.toFixed(0)} %`,
      dif: i.margenConocido.despues - i.margenConocido.antes,
      difTexto: `+${(i.margenConocido.despues - i.margenConocido.antes).toFixed(0)} pts`,
    },
    {
      nombre: 'Costos indirectos identificados',
      antes: i.cifIdentificados.antes,
      despues: i.cifIdentificados.despues,
      dif: i.cifIdentificados.despues - i.cifIdentificados.antes,
      difTexto: `+${i.cifIdentificados.despues - i.cifIdentificados.antes}`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-[11px] tracking-[0.2em] uppercase text-stone-500">
        Antes con el cuaderno · después con la plataforma
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[34rem]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-stone-400 border-b border-stone-200">
              <th className="py-2.5 font-medium">Indicador</th>
              <th className="py-2.5 font-medium text-right">Antes</th>
              <th className="py-2.5 font-medium text-right">Después</th>
              <th className="py-2.5 font-medium text-right">Cambio</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.nombre} className="border-b border-stone-100">
                <td className="py-3 font-medium">{f.nombre}</td>
                <td className="py-3 text-right text-stone-500 tabular-nums">{f.antes}</td>
                <td className="py-3 text-right font-bold tabular-nums">{f.despues}</td>
                <td
                  className={`py-3 text-right font-black tabular-nums ${
                    f.dif > 0 ? 'text-green-700' : f.dif < 0 ? 'text-red-700' : 'text-stone-400'
                  }`}
                >
                  {f.difTexto}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {d.aviso && (
        <div className="bg-amber-50 border border-amber-200 rounded-sm p-4 text-sm text-amber-900">
          <strong>Nota metodológica:</strong> {d.aviso}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Bloque titulo="Antes · del cuaderno" filas={d.antes} />
        <Bloque titulo="Después · de la plataforma" filas={d.despues} />
      </div>
    </div>
  );
};

const Bloque = ({ titulo, filas }) => (
  <div className="border border-stone-200 rounded-sm overflow-hidden">
    <div className="bg-stone-50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-stone-600">
      {titulo}
    </div>
    {filas.length === 0 ? (
      <div className="p-4 text-xs text-stone-500">Sin datos todavía.</div>
    ) : (
      <table className="w-full text-xs">
        <tbody>
          {filas.map((f) => (
            <tr key={f.periodo} className="border-b border-stone-100 last:border-0">
              <td className="px-4 py-2 text-stone-600">{nombrePeriodo(f.periodo)}</td>
              <td className="px-4 py-2 text-right font-bold tabular-nums">{bs(f.ganancia)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

// ── Estado de resultados ─────────────────────────────────────

const EstadoResultados = ({ d }) => (
  <div>
    <div className="text-[11px] tracking-[0.2em] uppercase text-stone-500 mb-3">
      {d.nombrePeriodo} · calculado en vivo
    </div>

    <table className="w-full text-sm mb-4">
      <tbody>
        <tr className="border-b border-stone-100">
          <td className="py-2.5 font-medium">Ingresos por ventas</td>
          <td className="py-2.5 text-right font-bold text-green-700 tabular-nums">
            + {bs(d.ingresos.total)}
          </td>
        </tr>
        {d.egresos.porCategoria.length > 0 && (
          <tr>
            <td colSpan={2} className="pt-3 pb-1 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
              Gastos del taller
            </td>
          </tr>
        )}
        {d.egresos.porCategoria.map((c) => (
          <tr key={c.categoria} className="border-b border-stone-50">
            <td className="py-2 pl-3 text-stone-600">{c.categoria}</td>
            <td className="py-2 text-right text-red-600 tabular-nums">− {bs(c.monto)}</td>
          </tr>
        ))}
        {d.retiros.porCategoria.length > 0 && (
          <tr>
            <td colSpan={2} className="pt-3 pb-1 text-[11px] font-bold text-amber-600 uppercase tracking-wider">
              Retiros para la casa
            </td>
          </tr>
        )}
        {d.retiros.porCategoria.map((c) => (
          <tr key={c.categoria} className="border-b border-stone-50">
            <td className="py-2 pl-3 text-stone-600">{c.categoria}</td>
            <td className="py-2 text-right text-amber-700 tabular-nums">− {bs(c.monto)}</td>
          </tr>
        ))}
      </tbody>
    </table>

    <div className="bg-stone-900 text-white p-4 rounded-sm flex justify-between items-center">
      <div className="text-[11px] uppercase tracking-wider text-stone-400">Ganancia real</div>
      <div className={`text-2xl font-black ${d.gananciaReal >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {bs(d.gananciaReal)}
      </div>
    </div>

    {d.mezclaPersonal > 0 && (
      <p className="text-xs text-stone-500 mt-3 leading-relaxed">
        Se retiraron {bs(d.mezclaPersonal)} de la caja del negocio para gastos de la casa. Sin esa
        mezcla, la ganancia habría sido <strong>{bs(d.gananciaSinMezcla)}</strong>.
      </p>
    )}
  </div>
);

// ── Flujo de caja ────────────────────────────────────────────

const FlujoCaja = ({ d }) => (
  <div>
    <div className="text-[11px] tracking-[0.2em] uppercase text-stone-500 mb-3">
      {d.nombrePeriodo} · saldo día a día
    </div>

    {d.filas.length === 0 ? (
      <p className="text-sm text-stone-500 py-6 text-center">
        Todavía no hay movimientos en este período.
      </p>
    ) : (
      <>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[30rem]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-stone-400 border-b border-stone-200">
                <th className="py-2 font-medium">Fecha</th>
                <th className="py-2 font-medium text-right">Entró</th>
                <th className="py-2 font-medium text-right">Salió</th>
                <th className="py-2 font-medium text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {d.filas.map((f) => (
                <tr key={f.fecha} className="border-b border-stone-50">
                  <td className="py-2 text-stone-600">{fechaCorta(f.fecha)}</td>
                  <td className="py-2 text-right text-green-700 tabular-nums">
                    {f.entrada ? bs(f.entrada, { simbolo: false }) : '—'}
                  </td>
                  <td className="py-2 text-right text-red-600 tabular-nums">
                    {f.salida ? bs(f.salida, { simbolo: false }) : '—'}
                  </td>
                  <td
                    className={`py-2 text-right font-bold tabular-nums ${
                      f.saldoAcumulado < 0 ? 'text-red-700' : ''
                    }`}
                  >
                    {bs(f.saldoAcumulado, { simbolo: false })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {d.aviso && (
          <div className="bg-amber-50 border border-amber-200 rounded-sm p-3 text-xs text-amber-900 mt-4">
            {d.aviso}
          </div>
        )}
      </>
    )}
  </div>
);

// ── Kardex ───────────────────────────────────────────────────

const Kardex = ({ d }) => (
  <div>
    <div className="text-[11px] tracking-[0.2em] uppercase text-stone-500 mb-3">
      Stock valorizado a promedio ponderado
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[34rem]">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-stone-400 border-b border-stone-200">
            <th className="py-2 font-medium">Código</th>
            <th className="py-2 font-medium">Material</th>
            <th className="py-2 font-medium text-right">Stock</th>
            <th className="py-2 font-medium text-right">Costo prom.</th>
            <th className="py-2 font-medium text-right">Valor</th>
          </tr>
        </thead>
        <tbody>
          {d.filas.map((f) => (
            <tr key={f.codigo} className="border-b border-stone-50">
              <td className="py-2 font-mono text-xs text-stone-500">{f.codigo}</td>
              <td className="py-2 font-medium">{f.nombre}</td>
              <td className="py-2 text-right tabular-nums">
                {f.stock} {f.unidad}
              </td>
              <td className="py-2 text-right text-stone-600 tabular-nums">
                {bs(f.costoPromedio, { simbolo: false })}
              </td>
              <td className="py-2 text-right font-bold tabular-nums">
                {bs(f.valorTotal, { simbolo: false })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className="bg-stone-900 text-white p-4 rounded-sm flex justify-between items-center mt-4">
      <div className="text-[11px] uppercase tracking-wider text-stone-400">
        Valor total del inventario
      </div>
      <div className="text-2xl font-black text-orange-400">{bs(d.valorTotal)}</div>
    </div>
  </div>
);

// ── Costeo ───────────────────────────────────────────────────

const Costeo = ({ d }) => (
  <div>
    <div className="text-[11px] tracking-[0.2em] uppercase text-stone-500 mb-3">
      Costo unitario por prenda
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[34rem]">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-stone-400 border-b border-stone-200">
            <th className="py-2 font-medium">Producto</th>
            <th className="py-2 font-medium text-right">Materiales</th>
            <th className="py-2 font-medium text-right">Mano obra</th>
            <th className="py-2 font-medium text-right">Costo</th>
            <th className="py-2 font-medium text-right">Margen</th>
          </tr>
        </thead>
        <tbody>
          {d.filas.map((f) => (
            <tr key={f.sku} className="border-b border-stone-50">
              <td className="py-2.5">
                <div className="font-medium">{f.nombre}</div>
                <div className="font-mono text-[11px] text-stone-400">{f.sku}</div>
              </td>
              <td className="py-2.5 text-right text-stone-600 tabular-nums">
                {bs(f.costoMateriales, { simbolo: false })}
              </td>
              <td className="py-2.5 text-right text-stone-600 tabular-nums">
                {bs(f.manoObra, { simbolo: false })}
              </td>
              <td className="py-2.5 text-right font-black tabular-nums">
                {bs(f.costoTotal, { simbolo: false })}
              </td>
              <td
                className={`py-2.5 text-right font-bold tabular-nums ${
                  f.margenPct < 20 ? 'text-red-700' : 'text-green-700'
                }`}
              >
                {f.margenPct.toFixed(1)} %
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <p className="text-[11px] text-stone-400 mt-3">{d.aviso}</p>
  </div>
);

// ── Auxiliares ───────────────────────────────────────────────

const NoDisponible = ({ categoria }) => (
  <div className="text-center py-10">
    <div className="w-14 h-14 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <Lock size={22} className="text-stone-400" />
    </div>
    <h3 className="font-black text-stone-900 mb-2">Todavía no hay datos para este reporte</h3>
    <p className="text-sm text-stone-500 max-w-sm mx-auto leading-relaxed">
      {categoria.nombre} necesita módulos que el sistema todavía no tiene conectados
      {categoria.id === 'ventas-periodo' && ' (requiere el flujo de pedidos de la tienda)'}
      {categoria.id === 'balance-general' && ' (requiere activos, pasivos y patrimonio)'}
      {categoria.id === 'tributario-sin' && ' (requiere el régimen tributario del taller)'}.
    </p>
  </div>
);

const BotonExport = ({ onClick, cargando, icono: Icono, texto }) => (
  <button
    onClick={onClick}
    disabled={cargando}
    className="flex items-center gap-1.5 border border-stone-300 px-3 py-2 text-xs font-bold rounded-sm hover:bg-stone-100 disabled:opacity-50"
  >
    {cargando ? <Loader2 size={13} className="animate-spin" /> : <Icono size={13} />}
    {texto}
    {!cargando && <Download size={11} className="text-stone-400" />}
  </button>
);
