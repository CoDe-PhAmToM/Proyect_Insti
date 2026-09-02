// ============================================================
// VISTA: Registros de Ingresos y Egresos v2.0  ← NUEVA VISTA
// Corazón del problema: los productores no registran nada.
// Esta vista es la más importante del sistema.
// ============================================================

import React, { useState } from 'react';
import { Plus, AlertTriangle, TrendingUp, TrendingDown, Filter } from 'lucide-react';
import { Modal, FormField, inputClass } from '../components/Modal';
import { useRegistros } from '../context/RegistrosContext';

const CATEGORIAS = ['Venta prendas', 'Materia prima', 'Servicios', 'Mano de obra', 'Gasto personal', 'Otro'];

const FORM_VACIO = {
  fecha: '',
  tipo: 'ingreso',
  categoria: 'Venta prendas',
  descripcion: '',
  monto: '',
  origen: 'negocio',
};

export const Registros = () => {
  const { registros, agregarRegistro, totalIngresos, totalEgresos, totalPersonal, gananciaReal, gananciaSinMezcla } = useRegistros();
  const [filtro, setFiltro] = useState('todos');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [errores, setErrores] = useState({});

  const registrosFiltrados = registros.filter(r => {
    if (filtro === 'todos')    return true;
    if (filtro === 'ingresos') return r.tipo === 'ingreso';
    if (filtro === 'egresos')  return r.tipo === 'egreso';
    if (filtro === 'personal') return r.origen === 'personal';
    return true;
  });

  const hoy = () => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  };

  const abrirModal = () => {
    setForm({ ...FORM_VACIO, fecha: hoy() });
    setErrores({});
    setModalAbierto(true);
  };

  const validar = () => {
    const errs = {};
    if (!form.descripcion.trim()) errs.descripcion = 'Escribí una descripción';
    if (!form.monto || Number(form.monto) <= 0) errs.monto = 'El monto tiene que ser mayor a 0';
    if (!form.fecha) errs.fecha = 'Elegí una fecha';
    setErrores(errs);
    return Object.keys(errs).length === 0;
  };

  const guardarRegistro = () => {
    if (!validar()) return;
    agregarRegistro({
      fecha: form.fecha,
      tipo: form.tipo,
      categoria: form.categoria,
      descripcion: form.descripcion.trim(),
      monto: Number(form.monto),
      origen: form.origen,
    });
    setModalAbierto(false);
  };

  return (
    <div className="p-8 space-y-6">

      {/* Advertencia gastos mezclados — refleja ítem 6 de la encuesta */}
      {totalPersonal > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-black text-amber-900 text-sm mb-1">
                Bs. {totalPersonal} en gastos personales mezclados con el negocio
              </div>
              <div className="text-xs text-amber-800 leading-relaxed">
                Esto hace que tu ganancia real parezca menor de lo que es. Se recomienda separar estos gastos
                para conocer la rentabilidad real del negocio. Los registros marcados como <strong>PERSONAL</strong> están resaltados abajo.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resumen del período */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-stone-200 p-5 rounded-sm">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-green-600" />
            <div className="text-[10px] tracking-[0.25em] uppercase text-stone-500">Total ingresos</div>
          </div>
          <div className="text-3xl font-black text-green-700">Bs. {totalIngresos.toFixed(2)}</div>
          <div className="text-xs text-stone-500 mt-1">{registros.filter(r=>r.tipo==='ingreso').length} registros</div>
        </div>

        <div className="bg-white border border-stone-200 p-5 rounded-sm">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown size={16} className="text-red-600" />
            <div className="text-[10px] tracking-[0.25em] uppercase text-stone-500">Total egresos</div>
          </div>
          <div className="text-3xl font-black text-red-700">Bs. {totalEgresos.toFixed(2)}</div>
          <div className="text-xs text-stone-500 mt-1">
            Incluye <span className="text-amber-700 font-bold">Bs. {totalPersonal} personales</span>
          </div>
        </div>

        <div className={`p-5 rounded-sm border ${gananciaReal >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="text-[10px] tracking-[0.25em] uppercase text-stone-500 mb-3">Ganancia del período</div>
          <div className={`text-3xl font-black ${gananciaReal >= 0 ? 'text-green-800' : 'text-red-800'}`}>
            Bs. {gananciaReal.toFixed(2)}
          </div>
          <div className="text-xs text-stone-600 mt-1">
            Sin gastos personales: <strong className="text-green-800">Bs. {gananciaSinMezcla.toFixed(2)}</strong>
          </div>
        </div>
      </div>

      {/* Tabla de registros */}
      <div className="bg-white border border-stone-200 rounded-sm overflow-hidden">
        <div className="p-5 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[10px] tracking-[0.25em] uppercase text-stone-500 mb-1">Libro de cuentas</div>
            <h2 className="text-xl font-black tracking-tight">Todos los movimientos</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Filtros */}
            <Filter size={14} className="text-stone-400" />
            {[
              { key: 'todos',    label: 'Todos'    },
              { key: 'ingresos', label: 'Ingresos' },
              { key: 'egresos',  label: 'Egresos'  },
              { key: 'personal', label: '⚠ Personales' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFiltro(f.key)}
                className={`px-3 py-1.5 text-xs font-bold rounded-sm transition-colors ${
                  filtro === f.key
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {f.label}
              </button>
            ))}
            <button
              onClick={abrirModal}
              className="flex items-center gap-1.5 bg-orange-500 text-stone-950 px-4 py-1.5 text-xs font-black rounded-sm hover:bg-orange-400 ml-2"
            >
              <Plus size={13} /> NUEVO REGISTRO
            </button>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-stone-50">
            <tr className="text-left text-[10px] tracking-[0.2em] uppercase text-stone-500">
              <th className="px-5 py-3 font-medium">Fecha</th>
              <th className="px-5 py-3 font-medium">Descripción</th>
              <th className="px-5 py-3 font-medium">Categoría</th>
              <th className="px-5 py-3 font-medium text-center">Tipo</th>
              <th className="px-5 py-3 font-medium text-center">Origen</th>
              <th className="px-5 py-3 font-medium text-right">Monto (Bs.)</th>
            </tr>
          </thead>
          <tbody>
            {registrosFiltrados.map(r => (
              <tr
                key={r.id}
                className={`border-b border-stone-100 hover:bg-stone-50 transition-colors ${
                  r.origen === 'personal' ? 'bg-amber-50/60' : ''
                }`}
              >
                <td className="px-5 py-3 font-mono text-xs text-stone-500 whitespace-nowrap">{r.fecha}</td>
                <td className="px-5 py-3">
                  <span className="font-medium">{r.descripcion}</span>
                  {r.origen === 'personal' && (
                    <span className="ml-2 text-[9px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-sm font-black tracking-wider">
                      MEZCLADO
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-xs text-stone-500">{r.categoria}</td>
                <td className="px-5 py-3 text-center">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${
                    r.tipo === 'ingreso'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {r.tipo.toUpperCase()}
                  </span>
                </td>
                <td className="px-5 py-3 text-center">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${
                    r.origen === 'negocio'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {r.origen.toUpperCase()}
                  </span>
                </td>
                <td className={`px-5 py-3 text-right font-black tabular-nums ${
                  r.tipo === 'ingreso' ? 'text-green-700' : 'text-red-600'
                }`}>
                  {r.tipo === 'ingreso' ? '+' : '-'} {r.monto.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-stone-100 border-t-2 border-stone-300">
            <tr>
              <td colSpan={5} className="px-5 py-3 text-sm font-black uppercase tracking-wider">
                Ganancia del período
              </td>
              <td className={`px-5 py-3 text-right text-lg font-black tabular-nums ${
                gananciaReal >= 0 ? 'text-green-700' : 'text-red-700'
              }`}>
                Bs. {gananciaReal.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Modal: nuevo registro */}
      <Modal
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        title="Nuevo registro"
        subtitulo="Ingreso o egreso"
      >
        <div className="space-y-4">
          {/* Tipo: ingreso / egreso */}
          <FormField label="Tipo de movimiento">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, tipo: 'ingreso' }))}
                className={`py-2.5 rounded-sm text-sm font-bold border-2 transition-colors ${
                  form.tipo === 'ingreso'
                    ? 'bg-green-100 border-green-500 text-green-800'
                    : 'border-stone-200 text-stone-500 hover:border-stone-300'
                }`}
              >
                + Ingreso
              </button>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, tipo: 'egreso' }))}
                className={`py-2.5 rounded-sm text-sm font-bold border-2 transition-colors ${
                  form.tipo === 'egreso'
                    ? 'bg-red-100 border-red-500 text-red-800'
                    : 'border-stone-200 text-stone-500 hover:border-stone-300'
                }`}
              >
                − Egreso
              </button>
            </div>
          </FormField>

          {/* Fecha */}
          <FormField label="Fecha">
            <input
              type="text"
              placeholder="DD/MM/AAAA"
              value={form.fecha}
              onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
              className={inputClass}
            />
            {errores.fecha && <p className="text-xs text-red-600 mt-1">{errores.fecha}</p>}
          </FormField>

          {/* Categoría */}
          <FormField label="Categoría">
            <select
              value={form.categoria}
              onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
              className={inputClass}
            >
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </FormField>

          {/* Descripción */}
          <FormField label="Descripción">
            <input
              type="text"
              placeholder="Ej: Venta de 2 poleras negras talla M"
              value={form.descripcion}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              className={inputClass}
            />
            {errores.descripcion && <p className="text-xs text-red-600 mt-1">{errores.descripcion}</p>}
          </FormField>

          {/* Monto */}
          <FormField label="Monto (Bs.)">
            <input
              type="number"
              placeholder="0.00"
              min="0"
              step="0.01"
              value={form.monto}
              onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
              className={inputClass}
            />
            {errores.monto && <p className="text-xs text-red-600 mt-1">{errores.monto}</p>}
          </FormField>

          {/* Origen — el punto clave del proyecto */}
          <FormField label="¿De dónde sale o a dónde va esta plata?">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, origen: 'negocio' }))}
                className={`py-2.5 rounded-sm text-sm font-bold border-2 transition-colors ${
                  form.origen === 'negocio'
                    ? 'bg-blue-100 border-blue-500 text-blue-800'
                    : 'border-stone-200 text-stone-500 hover:border-stone-300'
                }`}
              >
                Del negocio
              </button>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, origen: 'personal' }))}
                className={`py-2.5 rounded-sm text-sm font-bold border-2 transition-colors ${
                  form.origen === 'personal'
                    ? 'bg-amber-100 border-amber-500 text-amber-800'
                    : 'border-stone-200 text-stone-500 hover:border-stone-300'
                }`}
              >
                Personal
              </button>
            </div>
            <p className="text-[11px] text-stone-500 mt-1.5">
              Marcá "Personal" si esta plata en realidad no es del taller, para que no se mezcle en tu ganancia real.
            </p>
          </FormField>

          {/* Acciones */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setModalAbierto(false)}
              className="flex-1 py-2.5 rounded-sm text-sm font-bold border border-stone-300 text-stone-600 hover:bg-stone-50"
            >
              Cancelar
            </button>
            <button
              onClick={guardarRegistro}
              className="flex-1 py-2.5 rounded-sm text-sm font-black bg-orange-500 text-stone-950 hover:bg-orange-400"
            >
              Guardar registro
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
