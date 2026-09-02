// ============================================================
// VISTA: Reportes contables v2.2
// Representa las 80 plantillas que definió el equipo de Contaduría,
// agrupadas en 7 familias. Los reportes con datos disponibles se
// calculan en vivo desde los mismos contexts que usa el resto del
// sistema (Registros, Materiales) — nunca number sueltos a mano.
// ============================================================

import React, { useState } from 'react';
import {
  FileText, FileSpreadsheet, Download, Lock, ChevronRight,
  TrendingUp, TrendingDown, Package, Shirt, Wallet, Landmark, Scale,
} from 'lucide-react';
import { useRegistros } from '../context/RegistrosContext';
import { useMateriales } from '../context/MaterialesContext';

// Las 7 familias suman las 80 plantillas reales que mencionó el
// equipo de Contaduría (12+10+15+18+9+8+8 = 80).
const CATEGORIAS = [
  { id: 'estado-resultados', nombre: 'Estado de Resultados',       familia: 'Contable',    plantillas: 12, icon: TrendingUp,  disponible: true  },
  { id: 'flujo-caja',        nombre: 'Flujo de Caja',               familia: 'Contable',    plantillas: 10, icon: Wallet,      disponible: true  },
  { id: 'kardex',            nombre: 'Kardex de Materiales',        familia: 'Inventario',  plantillas: 15, icon: Package,     disponible: true  },
  { id: 'costeo-productos',  nombre: 'Costeo de Productos',         familia: 'Producción',  plantillas: 18, icon: Shirt,       disponible: true  },
  { id: 'ventas-periodo',    nombre: 'Ventas por Período',          familia: 'Comercial',   plantillas: 9,  icon: TrendingDown,disponible: false },
  { id: 'balance-general',   nombre: 'Balance General',             familia: 'Contable',    plantillas: 8,  icon: Scale,       disponible: false },
  { id: 'tributario-sin',    nombre: 'Reportes Tributarios (SIN)',  familia: 'Legal',       plantillas: 8,  icon: Landmark,    disponible: false },
];

const TOTAL_PLANTILLAS = CATEGORIAS.reduce((a, c) => a + c.plantillas, 0);

export const Reportes = () => {
  const [categoriaId, setCategoriaId] = useState(CATEGORIAS[0].id);
  const [avisoExport, setAvisoExport] = useState(null); // 'pdf' | 'excel' | null

  const categoria = CATEGORIAS.find(c => c.id === categoriaId);

  const exportar = (formato) => {
    setAvisoExport(formato);
    setTimeout(() => setAvisoExport(null), 3500);
  };

  return (
    <div className="p-8 space-y-6">

      {/* Header con conteo total */}
      <div className="bg-stone-950 text-white p-6 rounded-sm flex items-center justify-between">
        <div>
          <div className="text-[10px] tracking-[0.25em] uppercase text-orange-400 mb-1">Equipo de Contaduría</div>
          <h2 className="text-xl font-black tracking-tight">{TOTAL_PLANTILLAS} plantillas contables definidas</h2>
          <p className="text-xs text-stone-400 mt-1">
            Agrupadas en {CATEGORIAS.length} familias. Las que tienen datos conectados se calculan en vivo abajo.
          </p>
        </div>
        <div className="text-right shrink-0 ml-6">
          <div className="text-3xl font-black text-orange-400">
            {CATEGORIAS.filter(c => c.disponible).length}/{CATEGORIAS.length}
          </div>
          <div className="text-[10px] text-stone-500 uppercase tracking-wider">familias conectadas</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">

        {/* Lista de categorías */}
        <div className="bg-white border border-stone-200 rounded-sm overflow-hidden h-fit">
          <div className="p-4 border-b border-stone-200">
            <div className="text-[10px] tracking-[0.25em] uppercase text-stone-500">Familias de reportes</div>
          </div>
          <div className="divide-y divide-stone-100">
            {CATEGORIAS.map(c => {
              const Icon = c.icon;
              const activa = categoriaId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setCategoriaId(c.id)}
                  className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${
                    activa ? 'bg-orange-50' : 'hover:bg-stone-50'
                  }`}
                >
                  <div className={`p-2 rounded-sm shrink-0 ${activa ? 'bg-orange-500 text-stone-950' : 'bg-stone-100 text-stone-500'}`}>
                    <Icon size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                      {c.nombre}
                      {!c.disponible && <Lock size={11} className="text-stone-400" />}
                    </div>
                    <div className="text-[11px] text-stone-500">{c.familia} · {c.plantillas} plantillas</div>
                  </div>
                  {activa && <ChevronRight size={14} className="text-orange-500 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Panel de preview */}
        <div className="col-span-2 bg-white border border-stone-200 rounded-sm overflow-hidden">
          <div className="p-5 border-b border-stone-200 flex items-center justify-between">
            <div>
              <div className="text-[10px] tracking-[0.25em] uppercase text-stone-500 mb-1">{categoria.familia}</div>
              <h2 className="text-xl font-black tracking-tight">{categoria.nombre}</h2>
            </div>
            {categoria.disponible && (
              <div className="flex gap-2">
                <button
                  onClick={() => exportar('pdf')}
                  className="flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 px-3 py-2 text-xs font-bold rounded-sm text-stone-700"
                >
                  <FileText size={13} /> PDF
                </button>
                <button
                  onClick={() => exportar('excel')}
                  className="flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 px-3 py-2 text-xs font-bold rounded-sm text-stone-700"
                >
                  <FileSpreadsheet size={13} /> EXCEL
                </button>
              </div>
            )}
          </div>

          {/* Aviso de exportación — honesto sobre el estado del beta */}
          {avisoExport && (
            <div className="mx-5 mt-4 bg-blue-50 border border-blue-200 rounded-sm p-3 flex items-start gap-2">
              <Download size={14} className="text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-900">
                La exportación a {avisoExport === 'pdf' ? 'PDF' : 'Excel'} se genera automáticamente cuando el backend
                esté conectado ({avisoExport === 'pdf' ? 'WeasyPrint' : 'openpyxl'}). Por ahora esta es la vista previa con datos reales del sistema.
              </p>
            </div>
          )}

          <div className="p-5">
            {categoria.id === 'estado-resultados' && <EstadoResultados />}
            {categoria.id === 'flujo-caja'        && <FlujoCaja />}
            {categoria.id === 'kardex'             && <Kardex />}
            {categoria.id === 'costeo-productos'   && <CosteoProductos />}
            {!categoria.disponible                 && <NoDisponible categoria={categoria} />}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Reporte: Estado de Resultados ────────────────────────────
const EstadoResultados = () => {
  const { ingresos, egresos, gananciaReal, egresosPorCategoria } = useRegistros();

  return (
    <div>
      <div className="text-[10px] tracking-[0.25em] uppercase text-stone-500 mb-3">Período actual · calculado en vivo</div>
      <table className="w-full text-sm mb-4">
        <tbody>
          <tr className="border-b border-stone-100">
            <td className="py-2.5 font-medium">Ingresos por ventas</td>
            <td className="py-2.5 text-right font-bold text-green-700">+ Bs. {ingresos.toFixed(2)}</td>
          </tr>
          <tr>
            <td colSpan={2} className="pt-3 pb-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider">Egresos por categoría</td>
          </tr>
          {Object.entries(egresosPorCategoria).map(([cat, monto]) => (
            <tr key={cat} className="border-b border-stone-50">
              <td className="py-2 pl-3 text-stone-600">{cat}</td>
              <td className="py-2 text-right text-red-600">− Bs. {monto.toFixed(2)}</td>
            </tr>
          ))}
          <tr className="border-t border-stone-200">
            <td className="py-2.5 font-bold">Total egresos</td>
            <td className="py-2.5 text-right font-black text-red-700">− Bs. {egresos.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      <div className="bg-stone-900 text-white p-4 rounded-sm flex justify-between items-center">
        <div className="text-[10px] uppercase tracking-wider text-stone-400">Resultado del período</div>
        <div className={`text-2xl font-black ${gananciaReal >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          Bs. {gananciaReal.toFixed(2)}
        </div>
      </div>
    </div>
  );
};

// ── Reporte: Flujo de Caja ───────────────────────────────────
const FlujoCaja = () => {
  const { registros } = useRegistros();

  const porFecha = registros.reduce((acc, r) => {
    if (!acc[r.fecha]) acc[r.fecha] = { entrada: 0, salida: 0 };
    if (r.tipo === 'ingreso') acc[r.fecha].entrada += r.monto;
    else acc[r.fecha].salida += r.monto;
    return acc;
  }, {});

  const fechas = Object.keys(porFecha); // ya vienen más reciente primero
  let saldo = 0;
  const filas = [...fechas].reverse().map(f => {
    saldo += porFecha[f].entrada - porFecha[f].salida;
    return { fecha: f, ...porFecha[f], saldo };
  }).reverse();

  return (
    <div>
      <div className="text-[10px] tracking-[0.25em] uppercase text-stone-500 mb-3">Movimiento de efectivo día a día</div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] tracking-[0.2em] uppercase text-stone-400 border-b border-stone-100">
            <th className="py-2 font-medium">Fecha</th>
            <th className="py-2 font-medium text-right">Entradas</th>
            <th className="py-2 font-medium text-right">Salidas</th>
            <th className="py-2 font-medium text-right">Saldo acumulado</th>
          </tr>
        </thead>
        <tbody>
          {filas.map(f => (
            <tr key={f.fecha} className="border-b border-stone-50">
              <td className="py-2.5 font-mono text-xs text-stone-500">{f.fecha}</td>
              <td className="py-2.5 text-right text-green-700">+ {f.entrada.toFixed(2)}</td>
              <td className="py-2.5 text-right text-red-600">− {f.salida.toFixed(2)}</td>
              <td className={`py-2.5 text-right font-black ${f.saldo >= 0 ? 'text-stone-900' : 'text-red-700'}`}>Bs. {f.saldo.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── Reporte: Kardex de materiales ────────────────────────────
const Kardex = () => {
  const { materiales, resumen } = useMateriales();
  const valorTotal = resumen.valorInventario;

  return (
    <div>
      <div className="text-[10px] tracking-[0.25em] uppercase text-stone-500 mb-3">Stock valorizado actual</div>
      <table className="w-full text-sm mb-4">
        <thead>
          <tr className="text-left text-[10px] tracking-[0.2em] uppercase text-stone-400 border-b border-stone-100">
            <th className="py-2 font-medium">Código</th>
            <th className="py-2 font-medium">Material</th>
            <th className="py-2 font-medium text-right">Stock</th>
            <th className="py-2 font-medium text-right">Costo unit.</th>
            <th className="py-2 font-medium text-right">Valor total</th>
          </tr>
        </thead>
        <tbody>
          {materiales.map(m => (
            <tr key={m.id} className="border-b border-stone-50">
              <td className="py-2 font-mono text-xs text-stone-500">{m.codigo}</td>
              <td className="py-2 font-medium">{m.nombre}</td>
              <td className="py-2 text-right">{m.stock} {m.unidad}</td>
              <td className="py-2 text-right text-stone-600">Bs. {m.precioUnitario.toFixed(2)}</td>
              <td className="py-2 text-right font-bold">Bs. {m.valorInventario.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="bg-stone-900 text-white p-4 rounded-sm flex justify-between items-center">
        <div className="text-[10px] uppercase tracking-wider text-stone-400">Valor total del inventario</div>
        <div className="text-2xl font-black text-orange-400">Bs. {valorTotal.toFixed(2)}</div>
      </div>
      <p className="text-[11px] text-stone-400 mt-3">
        Fotografía actual del stock, valorizada a promedio ponderado. El historial de entradas y
        salidas de cada material se consulta desde Materiales.
      </p>
    </div>
  );
};

// ── Reporte: Costeo de productos ─────────────────────────────
// Los costos ya vienen calculados del servidor contra los precios
// vigentes del inventario, así que acá no se recalcula nada.
const CosteoProductos = () => {
  const { productos: filas } = useMateriales();

  return (
    <div>
      <div className="text-[10px] tracking-[0.25em] uppercase text-stone-500 mb-3">Costo unitario por prenda registrada</div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] tracking-[0.2em] uppercase text-stone-400 border-b border-stone-100">
            <th className="py-2 font-medium">SKU</th>
            <th className="py-2 font-medium">Producto</th>
            <th className="py-2 font-medium text-right">Materiales</th>
            <th className="py-2 font-medium text-right">Mano de obra</th>
            <th className="py-2 font-medium text-right">Costo total</th>
            <th className="py-2 font-medium text-right">Margen</th>
          </tr>
        </thead>
        <tbody>
          {filas.map(p => (
            <tr key={p.id} className="border-b border-stone-50">
              <td className="py-2.5 font-mono text-xs text-stone-500">{p.sku}</td>
              <td className="py-2.5 font-medium">{p.nombre}</td>
              <td className="py-2.5 text-right text-stone-600 tabular-nums">Bs. {p.costoMateriales?.toFixed(2)}</td>
              <td className="py-2.5 text-right text-stone-600 tabular-nums">Bs. {p.manoObraUnitaria?.toFixed(2)}</td>
              <td className="py-2.5 text-right font-black tabular-nums">Bs. {p.costoTotal?.toFixed(2)}</td>
              <td className={`py-2.5 text-right font-bold tabular-nums ${p.margenBrutoPct < 20 ? 'text-red-700' : 'text-green-700'}`}>
                {p.margenBrutoPct?.toFixed(1)} %
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[11px] text-stone-400 mt-3">
        Costos calculados contra los precios vigentes del inventario. Todavía no incluyen el gasto
        indirecto por prenda: eso se prorratea cuando haya órdenes de producción terminadas.
      </p>
    </div>
  );
};

// ── Estado: familia sin datos conectados aún ─────────────────
const NoDisponible = ({ categoria }) => (
  <div className="text-center py-10">
    <div className="w-14 h-14 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <Lock size={22} className="text-stone-400" />
    </div>
    <h3 className="font-black text-stone-900 mb-2">Todavía no hay datos para este reporte</h3>
    <p className="text-sm text-stone-500 max-w-sm mx-auto leading-relaxed">
      {categoria.nombre} necesita módulos que este beta no tiene conectados todavía
      {categoria.id === 'ventas-periodo' && ' (requiere el flujo de pedidos confirmados)'}
      {categoria.id === 'balance-general' && ' (requiere el plan de cuentas contable completo)'}
      {categoria.id === 'tributario-sin' && ' (pendiente de que Contaduría defina el formato exacto)'}
      .
    </p>
  </div>
);
