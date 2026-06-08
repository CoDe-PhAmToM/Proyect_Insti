// ============================================================
// VISTAS: Materiales + Costeo v2.0
// ============================================================

import React, { useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { MATERIALES, RECETA_POLERA, MANO_OBRA, CIF_UNITARIO } from '../data/mockData';

// ── Materiales ───────────────────────────────────────────────
export const Materiales = () => {
  const valorTotal = MATERIALES.reduce((a, m) => a + m.precio * m.stock, 0);
  const criticos   = MATERIALES.filter(m => m.estado === 'critico').length;
  const bajos      = MATERIALES.filter(m => m.estado === 'bajo').length;

  return (
    <div className="p-8 space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-stone-200 p-5 rounded-sm">
          <div className="text-[10px] tracking-[0.25em] uppercase text-stone-500 mb-2">Total materiales</div>
          <div className="text-3xl font-black">{MATERIALES.length}</div>
          <div className="text-xs text-stone-500 mt-1">tipos registrados</div>
        </div>
        <div className="bg-white border border-stone-200 p-5 rounded-sm">
          <div className="text-[10px] tracking-[0.25em] uppercase text-stone-500 mb-2">Valor en inventario</div>
          <div className="text-3xl font-black">Bs. {valorTotal.toFixed(0)}</div>
          <div className="text-xs text-stone-500 mt-1">a precio de costo</div>
        </div>
        <div className={`p-5 rounded-sm border ${criticos > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-stone-200'}`}>
          <div className="text-[10px] tracking-[0.25em] uppercase text-stone-500 mb-2">Alertas de stock</div>
          <div className="text-3xl font-black text-red-700">{criticos + bajos}</div>
          <div className="text-xs text-red-700 mt-1">{criticos} crítico{criticos !== 1 ? 's' : ''} · {bajos} bajo{bajos !== 1 ? 's' : ''}</div>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-sm overflow-hidden">
        <div className="p-5 border-b border-stone-200 flex justify-between items-center">
          <div>
            <div className="text-[10px] tracking-[0.25em] uppercase text-stone-500 mb-1">Producción</div>
            <h2 className="text-xl font-black tracking-tight">Inventario de insumos</h2>
          </div>
          <button className="flex items-center gap-1.5 bg-stone-900 text-white px-4 py-2 text-xs font-black rounded-sm hover:bg-stone-800">
            <Plus size={13} /> NUEVO MATERIAL
          </button>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-stone-50">
            <tr className="text-left text-[10px] tracking-[0.2em] uppercase text-stone-500">
              <th className="px-5 py-3 font-medium">Código</th>
              <th className="px-5 py-3 font-medium">Material</th>
              <th className="px-5 py-3 font-medium">Categoría</th>
              <th className="px-5 py-3 font-medium text-right">Precio Bs.</th>
              <th className="px-5 py-3 font-medium text-right">Stock</th>
              <th className="px-5 py-3 font-medium text-right">Mínimo</th>
              <th className="px-5 py-3 font-medium text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            {MATERIALES.map((m, i) => (
              <tr key={i} className={`border-b border-stone-100 hover:bg-stone-50 ${m.estado === 'critico' ? 'bg-red-50/50' : m.estado === 'bajo' ? 'bg-yellow-50/50' : ''}`}>
                <td className="px-5 py-3 font-mono text-xs font-bold text-stone-600">{m.codigo}</td>
                <td className="px-5 py-3 font-semibold">{m.nombre}</td>
                <td className="px-5 py-3 text-stone-500 text-xs">{m.cat}</td>
                <td className="px-5 py-3 text-right font-bold tabular-nums">{m.precio.toFixed(2)}</td>
                <td className={`px-5 py-3 text-right tabular-nums font-semibold ${m.estado !== 'ok' ? 'text-red-700' : ''}`}>
                  {m.stock} {m.unidad}
                </td>
                <td className="px-5 py-3 text-right text-stone-400 text-xs">{m.min}</td>
                <td className="px-5 py-3 text-center">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${
                    m.estado === 'ok'      ? 'bg-green-100 text-green-800' :
                    m.estado === 'bajo'    ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                  }`}>
                    {m.estado === 'ok' ? 'NORMAL' : m.estado === 'bajo' ? 'BAJO' : 'CRÍTICO'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Costeo ───────────────────────────────────────────────────
export const Costeo = () => {
  const [margen, setMargen] = useState(40);

  const subtotalMat   = RECETA_POLERA.reduce((a, r) => a + r.subtotal, 0);
  const costoTotal    = subtotalMat + MANO_OBRA + CIF_UNITARIO;
  const precioSugerido = costoTotal * (1 + margen / 100);
  const gananciaUnit  = precioSugerido - costoTotal;

  return (
    <div className="p-8 grid grid-cols-3 gap-6">

      {/* BOM / Receta */}
      <div className="col-span-2 space-y-5">
        <div className="bg-white border border-stone-200 rounded-sm overflow-hidden">
          <div className="p-5 border-b border-stone-200">
            <div className="text-[10px] tracking-[0.25em] uppercase text-stone-500 mb-1">Ficha técnica</div>
            <h2 className="text-2xl font-black tracking-tight">Polera Clásica Urbana</h2>
            <div className="text-xs text-stone-500 mt-1">SKU: POL-CLA-001 · ¿Cuánto te cuesta hacer una unidad?</div>
          </div>

          <div className="p-5">
            {/* Materiales */}
            <div className="text-[10px] tracking-[0.25em] uppercase text-stone-500 mb-3">
              1 · Materiales directos (lo que comprás para hacerla)
            </div>
            <table className="w-full text-sm mb-6">
              <thead>
                <tr className="text-left text-[10px] tracking-[0.2em] uppercase text-stone-400 border-b border-stone-100">
                  <th className="py-2 font-medium">Material</th>
                  <th className="py-2 font-medium text-right">Cantidad</th>
                  <th className="py-2 font-medium text-right">Precio unit.</th>
                  <th className="py-2 font-medium text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {RECETA_POLERA.map((r, i) => (
                  <tr key={i} className="border-b border-stone-50">
                    <td className="py-2.5 font-medium">{r.material}</td>
                    <td className="py-2.5 text-right text-stone-600">{r.cantidad} {r.unidad}</td>
                    <td className="py-2.5 text-right text-stone-600">Bs. {r.costo.toFixed(2)}</td>
                    <td className="py-2.5 text-right font-bold">Bs. {r.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="border-t border-stone-200">
                  <td colSpan={3} className="py-2 text-xs font-bold text-stone-600 uppercase tracking-wider">Subtotal materiales</td>
                  <td className="py-2 text-right font-black">Bs. {subtotalMat.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            {/* Mano de obra y CIF */}
            <div className="text-[10px] tracking-[0.25em] uppercase text-stone-500 mb-3">
              2 · Otros costos (lo que no siempre se suma)
            </div>
            <div className="space-y-2 mb-6">
              <div className="flex justify-between items-center py-2 border-b border-stone-100 text-sm">
                <div>
                  <div className="font-medium">Mano de obra directa</div>
                  <div className="text-xs text-stone-500">Tu tiempo o pago al ayudante por prenda</div>
                </div>
                <span className="font-bold">Bs. {MANO_OBRA.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-stone-100 text-sm">
                <div>
                  <div className="font-medium">Gastos indirectos prorrateados</div>
                  <div className="text-xs text-stone-500">Luz, agua, alquiler dividido entre todas las prendas</div>
                </div>
                <span className="font-bold">Bs. {CIF_UNITARIO.toFixed(2)}</span>
              </div>
            </div>

            {/* Total */}
            <div className="bg-stone-900 text-white p-4 rounded-sm flex justify-between items-center">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-stone-400 mb-1">Costo total por unidad</div>
                <div className="text-xs text-stone-400">Materiales + mano de obra + gastos indirectos</div>
              </div>
              <div className="text-3xl font-black text-orange-400">Bs. {costoTotal.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Panel de precio */}
      <div className="space-y-5">
        <div className="bg-stone-950 text-stone-100 p-6 rounded-sm">
          <div className="text-[10px] tracking-[0.25em] uppercase text-orange-400 mb-2">Simulador de precio</div>
          <h3 className="text-lg font-black mb-1">¿A cuánto venderla?</h3>
          <p className="text-xs text-stone-500 mb-5">Mové el slider para ver cómo cambia tu ganancia</p>

          <div className="mb-5">
            <div className="flex items-end justify-between mb-2">
              <span className="text-xs text-stone-400">Margen de ganancia</span>
              <span className="text-3xl font-black text-orange-400">{margen}%</span>
            </div>
            <input
              type="range" min="10" max="80" value={margen}
              onChange={e => setMargen(Number(e.target.value))}
              className="w-full accent-orange-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-stone-600 mt-1">
              <span>10% · mínimo</span><span>40% · recomendado</span><span>80%</span>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-stone-800 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-400">Te cuesta hacer</span>
              <span className="font-bold">Bs. {costoTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Ganás por unidad</span>
              <span className="font-bold text-green-400">+ Bs. {gananciaUnit.toFixed(2)}</span>
            </div>
            <div className="pt-3 border-t border-stone-800">
              <div className="text-[10px] tracking-[0.25em] uppercase text-stone-500 mb-1">Precio sugerido de venta</div>
              <div className="text-4xl font-black text-orange-400">Bs. {precioSugerido.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Recomendación contextual */}
        <div className="bg-orange-50 border border-orange-200 p-4 rounded-sm">
          <div className="flex items-start gap-2">
            <Sparkles size={15} className="text-orange-600 mt-0.5 shrink-0" />
            <div>
              <div className="text-[10px] font-black text-orange-900 uppercase tracking-wider mb-1">Dato del mercado</div>
              <p className="text-xs text-stone-700 leading-relaxed">
                Poleras similares en el Distrito 6 se venden entre <strong>Bs. 55 y Bs. 75</strong>.
                Con un 40% de margen, tu precio queda competitivo y cubrís todos tus costos reales.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
