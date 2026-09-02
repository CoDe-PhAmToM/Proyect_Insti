// ============================================================
// VISTAS: Materiales (CRUD) + Costeo v2.1
// Ambas leen y escriben del mismo MaterialesContext, así un
// cambio de precio/stock se refleja en el costeo al instante.
// ============================================================

import React, { useState } from 'react';
import { Plus, Sparkles, X, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { PRODUCTOS as PRODUCTOS_INICIALES } from '../data/mockData';
import { Modal, FormField, inputClass } from '../components/Modal';
import { useMateriales } from '../context/MaterialesContext';

const CATEGORIAS_MATERIAL = ['Tela', 'Hilo', 'Insumo'];
const UNIDADES = ['metro', 'cono', 'rollo', 'unidad', 'kg', 'litro'];

// ── Materiales (CRUD) ─────────────────────────────────────────
export const Materiales = () => {
  const { materiales, agregarMaterial, editarMaterial, eliminarMaterial } = useMateriales();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null); // null = crear, objeto = editar
  const [aEliminar, setAEliminar] = useState(null);

  const valorTotal = materiales.reduce((a, m) => a + m.precio * m.stock, 0);
  const criticos   = materiales.filter(m => m.estado === 'critico').length;
  const bajos      = materiales.filter(m => m.estado === 'bajo').length;

  const abrirNuevo = () => { setEditando(null); setModalAbierto(true); };
  const abrirEditar = (m) => { setEditando(m); setModalAbierto(true); };

  const confirmarEliminar = () => {
    eliminarMaterial(aEliminar.codigo);
    setAEliminar(null);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-stone-200 p-5 rounded-sm">
          <div className="text-[10px] tracking-[0.25em] uppercase text-stone-500 mb-2">Total materiales</div>
          <div className="text-3xl font-black">{materiales.length}</div>
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
          <button
            onClick={abrirNuevo}
            className="flex items-center gap-1.5 bg-stone-900 text-white px-4 py-2 text-xs font-black rounded-sm hover:bg-stone-800"
          >
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
              <th className="px-5 py-3 font-medium text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {materiales.map((m) => (
              <tr key={m.codigo} className={`border-b border-stone-100 hover:bg-stone-50 ${m.estado === 'critico' ? 'bg-red-50/50' : m.estado === 'bajo' ? 'bg-yellow-50/50' : ''}`}>
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
                <td className="px-5 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => abrirEditar(m)}
                      className="p-1.5 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-sm"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setAEliminar(m)}
                      className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-sm"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {materiales.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-sm text-stone-400">
                  No hay materiales registrados todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal crear/editar */}
      <MaterialFormModal
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        editando={editando}
        materiales={materiales}
        onCrear={agregarMaterial}
        onEditar={editarMaterial}
      />

      {/* Confirmación de eliminación */}
      <Modal
        open={!!aEliminar}
        onClose={() => setAEliminar(null)}
        title="¿Eliminar material?"
        subtitulo="Esta acción no se puede deshacer"
      >
        {aEliminar && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-sm p-3 flex items-start gap-2">
              <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">
                Vas a eliminar <strong>{aEliminar.nombre}</strong> ({aEliminar.codigo}).
                Si algún producto usa este material en su receta, el costeo de esa prenda va a quedar incompleto.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setAEliminar(null)} className="flex-1 py-2.5 rounded-sm text-sm font-bold border border-stone-300 text-stone-600 hover:bg-stone-50">
                Cancelar
              </button>
              <button onClick={confirmarEliminar} className="flex-1 py-2.5 rounded-sm text-sm font-black bg-red-600 text-white hover:bg-red-700">
                Sí, eliminar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// ── Modal: formulario de material (crear / editar) ────────────
const MaterialFormModal = ({ open, onClose, editando, materiales, onCrear, onEditar }) => {
  const vacio = { codigo: '', nombre: '', cat: 'Tela', unidad: 'metro', precio: '', stock: '', min: '' };
  const [form, setForm] = useState(vacio);
  const [error, setError] = useState('');

  // Sincroniza el formulario cuando cambia el material a editar
  React.useEffect(() => {
    if (open) {
      setForm(editando ? { ...editando } : { ...vacio, codigo: sugerirCodigo(materiales) });
      setError('');
    }
  }, [open, editando]);

  function sugerirCodigo(lista) {
    const prefijos = { Tela: 'TLA', Hilo: 'HIL', Insumo: 'INS' };
    const n = lista.length + 1;
    return `${prefijos['Tela']}-${String(n).padStart(3, '0')}`;
  }

  const guardar = () => {
    if (!form.nombre.trim())            { setError('Ponele un nombre al material'); return; }
    if (!form.codigo.trim())            { setError('El código es obligatorio'); return; }
    if (!editando && materiales.some(m => m.codigo === form.codigo.trim())) {
      setError('Ya existe un material con ese código'); return;
    }
    if (!form.precio || Number(form.precio) <= 0) { setError('El precio tiene que ser mayor a 0'); return; }
    if (form.stock === '' || Number(form.stock) < 0) { setError('El stock no puede ser negativo'); return; }
    if (!form.min || Number(form.min) <= 0)  { setError('Definí un stock mínimo mayor a 0'); return; }

    const data = {
      codigo: form.codigo.trim(),
      nombre: form.nombre.trim(),
      cat: form.cat,
      unidad: form.unidad,
      precio: Number(form.precio),
      stock: Number(form.stock),
      min: Number(form.min),
    };

    if (editando) {
      onEditar(editando.codigo, data);
    } else {
      onCrear(data);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editando ? 'Editar material' : 'Nuevo material'}
      subtitulo="Inventario de insumos"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Código">
            <input
              type="text"
              value={form.codigo}
              disabled={!!editando}
              onChange={e => setForm(f => ({ ...f, codigo: e.target.value.toUpperCase() }))}
              className={`${inputClass} ${editando ? 'bg-stone-100 text-stone-500' : ''}`}
            />
          </FormField>
          <FormField label="Categoría">
            <select
              value={form.cat}
              onChange={e => setForm(f => ({ ...f, cat: e.target.value }))}
              className={inputClass}
            >
              {CATEGORIAS_MATERIAL.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </FormField>
        </div>

        <FormField label="Nombre del material">
          <input
            type="text"
            placeholder="Ej: Algodón peinado 24/1"
            value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            className={inputClass}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Unidad de medida">
            <select
              value={form.unidad}
              onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))}
              className={inputClass}
            >
              {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </FormField>
          <FormField label="Precio unitario (Bs.)">
            <input
              type="number" min="0" step="0.01" placeholder="0.00"
              value={form.precio}
              onChange={e => setForm(f => ({ ...f, precio: e.target.value }))}
              className={inputClass}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Stock actual">
            <input
              type="number" min="0" step="1" placeholder="0"
              value={form.stock}
              onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
              className={inputClass}
            />
          </FormField>
          <FormField label="Stock mínimo">
            <input
              type="number" min="0" step="1" placeholder="0"
              value={form.min}
              onChange={e => setForm(f => ({ ...f, min: e.target.value }))}
              className={inputClass}
            />
          </FormField>
        </div>
        <p className="text-[11px] text-stone-500">
          El estado (Normal / Bajo / Crítico) se calcula solo, comparando el stock actual contra el mínimo.
        </p>

        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-sm text-sm font-bold border border-stone-300 text-stone-600 hover:bg-stone-50">
            Cancelar
          </button>
          <button onClick={guardar} className="flex-1 py-2.5 rounded-sm text-sm font-black bg-orange-500 text-stone-950 hover:bg-orange-400">
            {editando ? 'Guardar cambios' : 'Crear material'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ── Costeo ───────────────────────────────────────────────────
// Lee los materiales desde el context: si cambia un precio en el
// CRUD de Materiales, el costo se recalcula automáticamente.
export const Costeo = () => {
  const { materiales } = useMateriales();
  const [productos, setProductos]   = useState(PRODUCTOS_INICIALES);
  const [productoId, setProductoId] = useState(PRODUCTOS_INICIALES[0].id);
  const [margen, setMargen]         = useState(40);
  const [modalAbierto, setModalAbierto] = useState(false);

  const producto = productos.find(p => p.id === productoId);

  const lineasBom = producto.bom.map(item => {
    const mat = materiales.find(m => m.codigo === item.materialCodigo);
    return {
      ...item,
      nombre: mat?.nombre ?? 'Material eliminado del inventario',
      unidad: mat?.unidad ?? '',
      precioUnit: mat?.precio ?? 0,
      subtotal: (mat?.precio ?? 0) * item.cantidad,
      faltante: !mat,
    };
  });

  const subtotalMat    = lineasBom.reduce((a, l) => a + l.subtotal, 0);
  const costoTotal     = subtotalMat + producto.manoObra + producto.cif;
  const precioSugerido = costoTotal * (1 + margen / 100);
  const gananciaUnit   = precioSugerido - costoTotal;
  const hayFaltantes   = lineasBom.some(l => l.faltante);

  const agregarProducto = (nuevo) => {
    setProductos(prev => [...prev, nuevo]);
    setProductoId(nuevo.id);
    setModalAbierto(false);
  };

  return (
    <div className="p-8 space-y-5">

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {productos.map(p => (
            <button
              key={p.id}
              onClick={() => setProductoId(p.id)}
              className={`px-4 py-2 text-xs font-bold rounded-sm transition-colors ${
                productoId === p.id
                  ? 'bg-stone-900 text-white'
                  : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-400'
              }`}
            >
              {p.nombre}
            </button>
          ))}
        </div>
        <button
          onClick={() => setModalAbierto(true)}
          className="flex items-center gap-1.5 bg-orange-500 text-stone-950 px-4 py-2 text-xs font-black rounded-sm hover:bg-orange-400"
        >
          <Plus size={13} /> NUEVO PRODUCTO
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">

        <div className="col-span-2 space-y-5">
          <div className="bg-white border border-stone-200 rounded-sm overflow-hidden">
            <div className="p-5 border-b border-stone-200">
              <div className="text-[10px] tracking-[0.25em] uppercase text-stone-500 mb-1">Ficha técnica</div>
              <h2 className="text-2xl font-black tracking-tight">{producto.nombre}</h2>
              <div className="text-xs text-stone-500 mt-1">SKU: {producto.sku} · ¿Cuánto te cuesta hacer una unidad?</div>
            </div>

            <div className="p-5">
              {hayFaltantes && (
                <div className="bg-amber-50 border border-amber-300 rounded-sm p-3 mb-4 flex items-start gap-2">
                  <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    Este producto usa un material que ya no existe en tu inventario. El costo de abajo está incompleto — revisá la receta.
                  </p>
                </div>
              )}

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
                  {lineasBom.map((l, i) => (
                    <tr key={i} className={`border-b border-stone-50 ${l.faltante ? 'text-red-500' : ''}`}>
                      <td className="py-2.5 font-medium">{l.nombre}</td>
                      <td className="py-2.5 text-right text-stone-600">{l.cantidad} {l.unidad}</td>
                      <td className="py-2.5 text-right text-stone-600">Bs. {l.precioUnit.toFixed(2)}</td>
                      <td className="py-2.5 text-right font-bold">Bs. {l.subtotal.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-stone-200">
                    <td colSpan={3} className="py-2 text-xs font-bold text-stone-600 uppercase tracking-wider">Subtotal materiales</td>
                    <td className="py-2 text-right font-black">Bs. {subtotalMat.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="text-[10px] tracking-[0.25em] uppercase text-stone-500 mb-3">
                2 · Otros costos (lo que no siempre se suma)
              </div>
              <div className="space-y-2 mb-6">
                <div className="flex justify-between items-center py-2 border-b border-stone-100 text-sm">
                  <div>
                    <div className="font-medium">Mano de obra directa</div>
                    <div className="text-xs text-stone-500">Tu tiempo o pago al ayudante por prenda</div>
                  </div>
                  <span className="font-bold">Bs. {producto.manoObra.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-stone-100 text-sm">
                  <div>
                    <div className="font-medium">Gastos indirectos prorrateados</div>
                    <div className="text-xs text-stone-500">Luz, agua, alquiler dividido entre todas las prendas</div>
                  </div>
                  <span className="font-bold">Bs. {producto.cif.toFixed(2)}</span>
                </div>
              </div>

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

          <div className="bg-orange-50 border border-orange-200 p-4 rounded-sm">
            <div className="flex items-start gap-2">
              <Sparkles size={15} className="text-orange-600 mt-0.5 shrink-0" />
              <div>
                <div className="text-[10px] font-black text-orange-900 uppercase tracking-wider mb-1">Dato del mercado</div>
                <p className="text-xs text-stone-700 leading-relaxed">
                  Prendas similares en el Distrito 6 rondan precios parecidos.
                  Con un margen entre 35% y 45% cubrís tus costos reales y quedás competitivo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <NuevoProductoModal
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onGuardar={agregarProducto}
        productosExistentes={productos}
        materiales={materiales}
      />
    </div>
  );
};

// ── Modal: constructor de producto + BOM ─────────────────────
const NuevoProductoModal = ({ open, onClose, onGuardar, productosExistentes, materiales }) => {
  const vacio = { nombre: '', manoObra: '', cif: '' };
  const [form, setForm] = useState(vacio);
  const [bom, setBom] = useState([{ materialCodigo: materiales[0]?.codigo ?? '', cantidad: '' }]);
  const [error, setError] = useState('');

  const resetear = () => {
    setForm(vacio);
    setBom([{ materialCodigo: materiales[0]?.codigo ?? '', cantidad: '' }]);
    setError('');
  };

  const cerrar = () => { resetear(); onClose(); };

  const agregarLinea = () => setBom(prev => [...prev, { materialCodigo: materiales[0]?.codigo ?? '', cantidad: '' }]);
  const quitarLinea = (i) => setBom(prev => prev.filter((_, idx) => idx !== i));
  const actualizarLinea = (i, campo, valor) => setBom(prev => prev.map((l, idx) => idx === i ? { ...l, [campo]: valor } : l));

  const subtotalPreview = bom.reduce((a, l) => {
    const mat = materiales.find(m => m.codigo === l.materialCodigo);
    return a + (mat?.precio ?? 0) * (Number(l.cantidad) || 0);
  }, 0);
  const costoPreview = subtotalPreview + (Number(form.manoObra) || 0) + (Number(form.cif) || 0);

  const guardar = () => {
    if (!form.nombre.trim()) { setError('Ponele un nombre al producto'); return; }
    if (bom.some(l => !l.cantidad || Number(l.cantidad) <= 0)) {
      setError('Todas las líneas de materiales necesitan una cantidad mayor a 0');
      return;
    }
    if (!form.manoObra || Number(form.manoObra) < 0) { setError('Ingresá el costo de mano de obra'); return; }
    if (!form.cif || Number(form.cif) < 0) { setError('Ingresá el costo indirecto (CIF)'); return; }

    const nuevoId = Math.max(...productosExistentes.map(p => p.id)) + 1;
    const nuevo = {
      id: nuevoId,
      sku: `PRD-${String(nuevoId).padStart(3, '0')}`,
      nombre: form.nombre.trim(),
      bom: bom.map(l => ({ materialCodigo: l.materialCodigo, cantidad: Number(l.cantidad) })),
      manoObra: Number(form.manoObra),
      cif: Number(form.cif),
    };
    onGuardar(nuevo);
    resetear();
  };

  return (
    <Modal open={open} onClose={cerrar} title="Nuevo producto" subtitulo="Ficha técnica + receta (BOM)" wide>
      <div className="space-y-5">
        <FormField label="Nombre del producto">
          <input
            type="text"
            placeholder="Ej: Buzo con Capucha Talla L"
            value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            className={inputClass}
          />
        </FormField>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-bold tracking-[0.15em] uppercase text-stone-500">
              Receta · Materiales que usa
            </label>
            <button onClick={agregarLinea} className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1">
              <Plus size={12} /> AGREGAR MATERIAL
            </button>
          </div>

          <div className="space-y-2">
            {bom.map((linea, i) => {
              const mat = materiales.find(m => m.codigo === linea.materialCodigo);
              return (
                <div key={i} className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-sm p-2">
                  <select
                    value={linea.materialCodigo}
                    onChange={e => actualizarLinea(i, 'materialCodigo', e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-stone-300 rounded-sm text-xs bg-white focus:outline-none focus:border-orange-500"
                  >
                    {materiales.map(m => (
                      <option key={m.codigo} value={m.codigo}>{m.nombre} (Bs. {m.precio.toFixed(2)}/{m.unidad})</option>
                    ))}
                  </select>
                  <input
                    type="number" min="0" step="0.01" placeholder="Cant."
                    value={linea.cantidad}
                    onChange={e => actualizarLinea(i, 'cantidad', e.target.value)}
                    className="w-20 px-2 py-1.5 border border-stone-300 rounded-sm text-xs focus:outline-none focus:border-orange-500"
                  />
                  <span className="text-[10px] text-stone-400 w-10 shrink-0">{mat?.unidad}</span>
                  <span className="text-xs font-bold w-16 text-right shrink-0">
                    Bs. {((mat?.precio ?? 0) * (Number(linea.cantidad) || 0)).toFixed(2)}
                  </span>
                  {bom.length > 1 && (
                    <button onClick={() => quitarLinea(i)} className="text-red-500 hover:text-red-700 shrink-0">
                      <X size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Mano de obra (Bs.)">
            <input
              type="number" min="0" step="0.01" placeholder="0.00"
              value={form.manoObra}
              onChange={e => setForm(f => ({ ...f, manoObra: e.target.value }))}
              className={inputClass}
            />
          </FormField>
          <FormField label="Gastos indirectos / CIF (Bs.)">
            <input
              type="number" min="0" step="0.01" placeholder="0.00"
              value={form.cif}
              onChange={e => setForm(f => ({ ...f, cif: e.target.value }))}
              className={inputClass}
            />
          </FormField>
        </div>

        <div className="bg-stone-900 text-white p-4 rounded-sm flex justify-between items-center">
          <div className="text-xs text-stone-400 uppercase tracking-wider">Costo total estimado</div>
          <div className="text-2xl font-black text-orange-400">Bs. {costoPreview.toFixed(2)}</div>
        </div>

        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button onClick={cerrar} className="flex-1 py-2.5 rounded-sm text-sm font-bold border border-stone-300 text-stone-600 hover:bg-stone-50">
            Cancelar
          </button>
          <button onClick={guardar} className="flex-1 py-2.5 rounded-sm text-sm font-black bg-orange-500 text-stone-950 hover:bg-orange-400">
            Guardar producto
          </button>
        </div>
      </div>
    </Modal>
  );
};
