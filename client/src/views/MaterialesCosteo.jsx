// ============================================================
// VISTAS: Materiales (inventario) + Costeo v3.0
//
// Ambas leen del servidor. Un cambio de precio en el inventario se
// refleja en el costeo al instante porque el costo lo calcula la
// API contra los precios vigentes.
//
// v3: el stock ya NO se edita a mano. Se mueve con entradas,
// salidas y ajustes, y cada movimiento queda en el kardex. Editar
// el número directamente descuadraría la contabilidad del
// inventario y haría imposible el reporte de kardex.
// ============================================================

import React, { useState } from 'react';
import {
  Plus, Pencil, Trash2, AlertTriangle, ArrowDownUp, History, Loader2, X,
} from 'lucide-react';
import { Modal, FormField, inputClass } from '../components/Modal';
import { Cargando, ErrorCarga, SinDatos } from '../components/Layout';
import { useMateriales } from '../context/MaterialesContext';
import { useOrdenes } from '../context/OrdenesContext';
import { useAuth } from '../context/AuthContext';
import { bs, fechaCorta } from 'shared/formato';
import { margenBrutoPct, precioSugerido } from 'shared/costeo';

const CATEGORIAS_MATERIAL = ['Tela', 'Hilo', 'Insumo'];
const UNIDADES = ['metro', 'cono', 'rollo', 'unidad', 'kg', 'litro', 'docena'];

const ETIQUETA_ESTADO = { ok: 'NORMAL', bajo: 'BAJO', critico: 'CRÍTICO' };
const CLASE_ESTADO = {
  ok: 'bg-green-100 text-green-800',
  bajo: 'bg-yellow-100 text-yellow-800',
  critico: 'bg-red-100 text-red-800',
};

// ══════════════════════════════════════════════════════════════
// MATERIALES
// ══════════════════════════════════════════════════════════════

export const Materiales = () => {
  const {
    materiales, resumen, cargando, error, recargar,
    agregarMaterial, editarMaterial, eliminarMaterial, moverStock, verKardex,
  } = useMateriales();
  const { puedeVerCostos } = useAuth();

  const [modalForm, setModalForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [aEliminar, setAEliminar] = useState(null);
  const [moviendo, setMoviendo] = useState(null);
  const [kardexDe, setKardexDe] = useState(null);
  const [aviso, setAviso] = useState(null);

  if (cargando && materiales.length === 0) return <Cargando texto="Cargando tu inventario..." />;
  if (error) return <ErrorCarga mensaje={error} onReintentar={recargar} />;

  return (
    <div className="p-8 space-y-6">
      {aviso && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-sm p-4 flex items-start gap-3 text-sm">
          <div className="flex-1 text-blue-900">{aviso}</div>
          <button onClick={() => setAviso(null)} className="text-blue-500 hover:text-blue-800">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Tarjeta titulo="Tipos de material" valor={resumen.total} pie="registrados" />
        {puedeVerCostos && (
          <Tarjeta
            titulo="Valor del inventario"
            valor={bs(resumen.valorInventario)}
            pie="a precio de costo"
          />
        )}
        <div
          className={`p-5 rounded-sm border ${
            resumen.criticos > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-stone-200'
          }`}
        >
          <div className="text-[11px] tracking-[0.2em] uppercase text-stone-500 mb-2">
            Alertas de stock
          </div>
          <div className="text-3xl font-black text-red-700">
            {resumen.criticos + resumen.bajos}
          </div>
          <div className="text-xs text-red-700 mt-1">
            {resumen.criticos} crítico{resumen.criticos !== 1 ? 's' : ''} · {resumen.bajos} bajo
            {resumen.bajos !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-sm overflow-hidden">
        <div className="p-5 border-b border-stone-200 flex flex-wrap gap-3 justify-between items-center">
          <div>
            <div className="text-[11px] tracking-[0.2em] uppercase text-stone-500 mb-1">
              Producción
            </div>
            <h2 className="text-xl font-black tracking-tight">Inventario de insumos</h2>
          </div>
          <button
            onClick={() => {
              setEditando(null);
              setModalForm(true);
            }}
            className="flex items-center gap-1.5 bg-stone-900 text-white px-4 py-2.5 text-xs font-black rounded-sm hover:bg-stone-800"
          >
            <Plus size={14} /> NUEVO MATERIAL
          </button>
        </div>

        {materiales.length === 0 ? (
          <SinDatos
            titulo="Todavía no cargaste materiales"
            texto="Empezá por la tela y el hilo que más usás. Con eso el sistema ya puede calcular cuánto te cuesta cada prenda."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[52rem]">
              <thead className="bg-stone-50">
                <tr className="text-left text-[11px] tracking-[0.15em] uppercase text-stone-500">
                  <th className="px-5 py-3 font-medium">Código</th>
                  <th className="px-5 py-3 font-medium">Material</th>
                  {puedeVerCostos && <th className="px-5 py-3 font-medium text-right">Precio</th>}
                  <th className="px-5 py-3 font-medium text-right">Stock</th>
                  <th className="px-5 py-3 font-medium text-right">Mínimo</th>
                  <th className="px-5 py-3 font-medium text-center">Estado</th>
                  <th className="px-5 py-3 font-medium text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {materiales.map((m) => (
                  <tr
                    key={m.id}
                    className={`border-b border-stone-100 hover:bg-stone-50 ${
                      m.estado === 'critico'
                        ? 'bg-red-50/50'
                        : m.estado === 'bajo'
                          ? 'bg-yellow-50/50'
                          : ''
                    }`}
                  >
                    <td className="px-5 py-3 font-mono text-xs font-bold text-stone-600">
                      {m.codigo}
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-semibold">{m.nombre}</div>
                      <div className="text-[11px] text-stone-500">{m.categoria}</div>
                    </td>
                    {puedeVerCostos && (
                      <td className="px-5 py-3 text-right font-bold tabular-nums">
                        {bs(m.precioUnitario, { simbolo: false })}
                      </td>
                    )}
                    <td
                      className={`px-5 py-3 text-right tabular-nums font-semibold ${
                        m.estado !== 'ok' ? 'text-red-700' : ''
                      }`}
                    >
                      {m.stock} {m.unidad}
                    </td>
                    <td className="px-5 py-3 text-right text-stone-400 text-xs">{m.stockMinimo}</td>
                    <td className="px-5 py-3 text-center">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-sm ${CLASE_ESTADO[m.estado]}`}
                      >
                        {ETIQUETA_ESTADO[m.estado]}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <IconBtn
                          onClick={() => setMoviendo(m)}
                          title="Entrada o salida de stock"
                          icon={ArrowDownUp}
                        />
                        <IconBtn
                          onClick={() => setKardexDe(m)}
                          title="Ver movimientos"
                          icon={History}
                        />
                        <IconBtn
                          onClick={() => {
                            setEditando(m);
                            setModalForm(true);
                          }}
                          title="Editar"
                          icon={Pencil}
                        />
                        <IconBtn
                          onClick={() => setAEliminar(m)}
                          title="Borrar"
                          icon={Trash2}
                          peligro
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ModalMaterial
        open={modalForm}
        onClose={() => setModalForm(false)}
        editando={editando}
        onGuardar={async (datos) => {
          if (editando) await editarMaterial(editando.id, datos);
          else await agregarMaterial(datos);
          setModalForm(false);
        }}
      />

      <ModalMovimiento
        material={moviendo}
        onClose={() => setMoviendo(null)}
        onMover={async (mov) => {
          await moverStock(moviendo.id, mov);
          setMoviendo(null);
        }}
      />

      <ModalKardex material={kardexDe} onClose={() => setKardexDe(null)} verKardex={verKardex} />

      <Modal open={!!aEliminar} onClose={() => setAEliminar(null)} title="¿Borrar este material?">
        <div className="space-y-4">
          <p className="text-sm text-stone-600">
            Vas a borrar <strong>{aEliminar?.nombre}</strong>. Si forma parte de alguna receta o tiene
            movimientos, se archiva en vez de borrarse para no perder el historial de costos.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setAEliminar(null)}
              className="flex-1 py-2.5 border-2 border-stone-200 rounded-sm text-sm font-bold"
            >
              No, dejalo
            </button>
            <button
              onClick={async () => {
                const r = await eliminarMaterial(aEliminar.id);
                if (r?.mensaje) setAviso(r.mensaje);
                setAEliminar(null);
              }}
              className="flex-1 py-2.5 bg-red-600 text-white rounded-sm text-sm font-black hover:bg-red-700"
            >
              SÍ, BORRAR
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ── Modal: alta y edición de material ────────────────────────

const ModalMaterial = ({ open, onClose, editando, onGuardar }) => {
  const vacio = {
    codigo: '', nombre: '', categoria: 'Tela', unidad: 'metro',
    precioUnitario: '', stock: '', stockMinimo: '',
  };
  const [form, setForm] = useState(vacio);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  React.useEffect(() => {
    if (!open) return;
    setForm(
      editando
        ? {
            codigo: editando.codigo,
            nombre: editando.nombre,
            categoria: editando.categoria,
            unidad: editando.unidad,
            precioUnitario: String(editando.precioUnitario),
            stock: String(editando.stock),
            stockMinimo: String(editando.stockMinimo),
          }
        : vacio
    );
    setErrores({});
    setError(null);
  }, [open, editando]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    setErrores({});
    try {
      const datos = {
        codigo: form.codigo,
        nombre: form.nombre,
        categoria: form.categoria,
        unidad: form.unidad,
        precioUnitario: Number(form.precioUnitario || 0),
        stockMinimo: Number(form.stockMinimo || 0),
        ...(editando ? {} : { stock: Number(form.stock || 0) }),
      };
      await onGuardar(datos);
    } catch (e) {
      setError(e.message);
      setErrores(e.detalles ?? {});
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editando ? 'Editar material' : 'Nuevo material'}
      subtitulo="Inventario"
      wide
    >
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-800 text-sm rounded-sm p-3">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Código">
            <input
              value={form.codigo}
              onChange={set('codigo')}
              disabled={!!editando}
              placeholder="TLA-001"
              className={`${inputClass} ${editando ? 'bg-stone-100 text-stone-500' : ''}`}
            />
            {errores.codigo && <p className="text-xs text-red-600 mt-1">{errores.codigo}</p>}
          </FormField>
          <FormField label="Categoría">
            <select value={form.categoria} onChange={set('categoria')} className={inputClass}>
              {CATEGORIAS_MATERIAL.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField label="Nombre del material">
          <input
            value={form.nombre}
            onChange={set('nombre')}
            placeholder="Algodón peinado 30/1"
            className={inputClass}
          />
          {errores.nombre && <p className="text-xs text-red-600 mt-1">{errores.nombre}</p>}
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Unidad de medida">
            <select value={form.unidad} onChange={set('unidad')} className={inputClass}>
              {UNIDADES.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Precio por unidad (Bs.)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.precioUnitario}
              onChange={set('precioUnitario')}
              className={inputClass}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={editando ? 'Stock actual' : 'Stock inicial'}>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.stock}
              onChange={set('stock')}
              disabled={!!editando}
              className={`${inputClass} ${editando ? 'bg-stone-100 text-stone-500' : ''}`}
            />
            {editando && (
              <p className="text-[11px] text-stone-500 mt-1">
                El stock se cambia con entradas y salidas, para que quede el registro de qué pasó.
              </p>
            )}
          </FormField>
          <FormField label="Avisarme cuando baje de">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.stockMinimo}
              onChange={set('stockMinimo')}
              className={inputClass}
            />
          </FormField>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-3 border-2 border-stone-200 rounded-sm text-sm font-bold text-stone-600"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando}
            className="flex-1 py-3 bg-stone-900 text-white rounded-sm text-sm font-black hover:bg-stone-800 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {guardando && <Loader2 size={15} className="animate-spin" />}
            {editando ? 'GUARDAR CAMBIOS' : 'CREAR MATERIAL'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ── Modal: movimiento de stock ───────────────────────────────

const ModalMovimiento = ({ material, onClose, onMover }) => {
  const [tipo, setTipo] = useState('ENTRADA');
  const [cantidad, setCantidad] = useState('');
  const [costoUnitario, setCosto] = useState('');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  React.useEffect(() => {
    if (material) {
      setTipo('ENTRADA');
      setCantidad('');
      setCosto(String(material.precioUnitario));
      setMotivo('');
      setError(null);
    }
  }, [material]);

  const mover = async () => {
    setGuardando(true);
    setError(null);
    try {
      await onMover({
        tipo,
        cantidad: Number(cantidad),
        ...(tipo === 'ENTRADA' && costoUnitario ? { costoUnitario: Number(costoUnitario) } : {}),
        ...(motivo ? { motivo } : {}),
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  const OPCIONES = [
    { id: 'ENTRADA', label: 'Compré más', ayuda: 'Entra material al taller' },
    { id: 'SALIDA', label: 'Usé para producir', ayuda: 'Sale material del taller' },
    { id: 'AJUSTE', label: 'Conté y hay otra cantidad', ayuda: 'Corrige el stock al conteo real' },
  ];

  return (
    <Modal open={!!material} onClose={onClose} title={material?.nombre ?? ''} subtitulo="Mover stock">
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-800 text-sm rounded-sm p-3">
            {error}
          </div>
        )}

        <div className="bg-stone-50 border border-stone-200 rounded-sm p-3 text-sm">
          Ahora tenés{' '}
          <strong>
            {material?.stock} {material?.unidad}
          </strong>
        </div>

        <FormField label="¿Qué pasó?">
          <div className="space-y-2">
            {OPCIONES.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setTipo(o.id)}
                className={`w-full p-3 rounded-sm border-2 text-left ${
                  tipo === o.id ? 'bg-orange-50 border-orange-500' : 'border-stone-200'
                }`}
              >
                <div className="font-bold text-sm">{o.label}</div>
                <div className="text-[11px] text-stone-500">{o.ayuda}</div>
              </button>
            ))}
          </div>
        </FormField>

        <FormField
          label={tipo === 'AJUSTE' ? `Cantidad real contada (${material?.unidad})` : `Cantidad (${material?.unidad})`}
        >
          <input
            type="number"
            min="0"
            step="0.01"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            className={`${inputClass} text-lg font-bold`}
          />
        </FormField>

        {tipo === 'ENTRADA' && (
          <FormField label="¿A qué precio lo compraste? (Bs. por unidad)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={costoUnitario}
              onChange={(e) => setCosto(e.target.value)}
              className={inputClass}
            />
            <p className="text-[11px] text-stone-500 mt-1">
              El sistema recalcula el precio promedio con esta compra.
            </p>
          </FormField>
        )}

        <FormField label="Nota (opcional)">
          <input
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Compra en la feria"
            className={inputClass}
          />
        </FormField>

        <button
          onClick={mover}
          disabled={guardando || !cantidad}
          className="w-full py-3 bg-stone-900 text-white rounded-sm text-sm font-black hover:bg-stone-800 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {guardando && <Loader2 size={15} className="animate-spin" />}
          REGISTRAR MOVIMIENTO
        </button>
      </div>
    </Modal>
  );
};

// ── Modal: kardex ────────────────────────────────────────────

const ModalKardex = ({ material, onClose, verKardex }) => {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);

  React.useEffect(() => {
    if (!material) return setDatos(null);
    setCargando(true);
    verKardex(material.id)
      .then(setDatos)
      .finally(() => setCargando(false));
  }, [material, verKardex]);

  return (
    <Modal
      open={!!material}
      onClose={onClose}
      title={material?.nombre ?? ''}
      subtitulo="Historial de movimientos"
      wide
    >
      {cargando && <div className="text-sm text-stone-500 py-6 text-center">Cargando...</div>}
      {datos && datos.filas.length === 0 && (
        <div className="text-sm text-stone-500 py-6 text-center">Todavía no hay movimientos.</div>
      )}
      {datos && datos.filas.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[36rem]">
            <thead className="bg-stone-50">
              <tr className="text-left text-[11px] uppercase tracking-wider text-stone-500">
                <th className="px-3 py-2 font-medium">Fecha</th>
                <th className="px-3 py-2 font-medium">Motivo</th>
                <th className="px-3 py-2 font-medium text-right">Entró</th>
                <th className="px-3 py-2 font-medium text-right">Salió</th>
                <th className="px-3 py-2 font-medium text-right">Costo u.</th>
                <th className="px-3 py-2 font-medium text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {datos.filas.map((f) => (
                <tr key={f.id} className="border-b border-stone-100">
                  <td className="px-3 py-2 text-stone-500 whitespace-nowrap">{fechaCorta(f.fecha)}</td>
                  <td className="px-3 py-2 text-stone-600 text-xs">{f.motivo ?? '—'}</td>
                  <td className="px-3 py-2 text-right text-green-700 tabular-nums">
                    {f.entrada ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-red-700 tabular-nums">{f.salida ?? '—'}</td>
                  <td className="px-3 py-2 text-right text-stone-500 tabular-nums">
                    {bs(f.costoUnitario, { simbolo: false })}
                  </td>
                  <td className="px-3 py-2 text-right font-bold tabular-nums">
                    {f.saldoCantidad} {datos.material.unidad}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] text-stone-400 mt-3">
            Valorizado a promedio ponderado: cada salida se cuenta al precio promedio que tenía el
            material ese día, no al de hoy.
          </p>
        </div>
      )}
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════
// COSTEO
// ══════════════════════════════════════════════════════════════

export const Costeo = () => {
  const { productos, materiales, costosFijos, cargando, error, recargar, verProducto } =
    useMateriales();

  const [productoId, setProductoId] = useState(null);
  const [margen, setMargen] = useState(40);
  const [detalle, setDetalle] = useState(null);

  const seleccionado = productoId ?? productos[0]?.id ?? null;

  React.useEffect(() => {
    if (!seleccionado) return setDetalle(null);
    verProducto(seleccionado).then(setDetalle).catch(() => setDetalle(null));
  }, [seleccionado, verProducto, materiales]);

  if (cargando && productos.length === 0) return <Cargando texto="Cargando el costeo..." />;
  if (error) return <ErrorCarga mensaje={error} onReintentar={recargar} />;

  if (productos.length === 0) {
    return (
      <SinDatos
        titulo="Todavía no cargaste prendas"
        texto="Para saber cuánto te cuesta hacer una prenda, primero cargá el producto y su receta de materiales."
      />
    );
  }

  const costoTotal = detalle?.costoTotal ?? 0;
  const sugerido = precioSugerido(costoTotal, margen);
  const margenActual = detalle ? margenBrutoPct(detalle.precioVenta, costoTotal) : 0;

  return (
    <div className="p-8 space-y-5">
      <div className="flex items-center gap-2 flex-wrap">
        {productos.map((p) => (
          <button
            key={p.id}
            onClick={() => setProductoId(p.id)}
            className={`px-4 py-2 rounded-sm text-sm font-bold ${
              seleccionado === p.id
                ? 'bg-stone-900 text-white'
                : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-400'
            }`}
          >
            {p.nombre}
          </button>
        ))}
      </div>

      {detalle && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Receta */}
          <div className="bg-white border border-stone-200 rounded-sm overflow-hidden">
            <div className="p-5 border-b border-stone-200">
              <div className="text-[11px] tracking-[0.2em] uppercase text-stone-500 mb-1">
                Qué lleva
              </div>
              <h2 className="text-xl font-black tracking-tight">{detalle.nombre}</h2>
            </div>

            {detalle.hayFaltantes && (
              <div className="bg-red-50 border-b border-red-200 p-3 flex items-start gap-2 text-xs text-red-800">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                Falta algún material de la receta en tu inventario. El costo está incompleto.
              </div>
            )}

            <table className="w-full text-sm">
              <thead className="bg-stone-50">
                <tr className="text-left text-[11px] uppercase tracking-wider text-stone-500">
                  <th className="px-5 py-2.5 font-medium">Material</th>
                  <th className="px-5 py-2.5 font-medium text-right">Cantidad</th>
                  <th className="px-5 py-2.5 font-medium text-right">Cuesta</th>
                </tr>
              </thead>
              <tbody>
                {detalle.receta.map((l) => (
                  <tr key={l.materialId} className="border-b border-stone-100">
                    <td className={`px-5 py-2.5 ${l.faltante ? 'text-red-700 italic' : ''}`}>
                      {l.nombre}
                    </td>
                    <td className="px-5 py-2.5 text-right text-stone-500 tabular-nums">
                      {l.cantidad} {l.unidad}
                    </td>
                    <td className="px-5 py-2.5 text-right font-bold tabular-nums">
                      {bs(l.subtotal, { simbolo: false })}
                    </td>
                  </tr>
                ))}
                <tr className="border-b border-stone-100">
                  <td className="px-5 py-2.5 text-stone-600" colSpan={2}>
                    Mano de obra
                  </td>
                  <td className="px-5 py-2.5 text-right font-bold tabular-nums">
                    {bs(detalle.manoObraUnitaria, { simbolo: false })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Precio */}
          <div className="space-y-5">
            <div className="bg-stone-950 text-white p-6 rounded-sm">
              <div className="text-[11px] tracking-[0.2em] uppercase text-stone-400 mb-1">
                Te cuesta hacerla
              </div>
              <div className="text-3xl font-black text-orange-400">{bs(costoTotal)}</div>

              <div className="mt-5 pt-5 border-t border-stone-800">
                <div className="text-[11px] tracking-[0.2em] uppercase text-stone-400 mb-1">
                  La vendés a
                </div>
                <div className="text-2xl font-black">{bs(detalle.precioVenta)}</div>
                <div
                  className={`text-sm mt-1 font-bold ${
                    margenActual < 20 ? 'text-red-400' : 'text-green-400'
                  }`}
                >
                  Te queda {bs(detalle.precioVenta - costoTotal)} por prenda ({margenActual.toFixed(1)} %)
                </div>
                {margenActual < 20 && (
                  <div className="text-xs text-red-300 mt-2 leading-snug">
                    Es un margen delgado. Cualquier subida de la tela te deja sin ganancia.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border border-stone-200 p-6 rounded-sm">
              <div className="flex justify-between items-baseline mb-3">
                <div className="text-[11px] tracking-[0.2em] uppercase text-stone-500">
                  Si quisieras ganar
                </div>
                <span className="text-2xl font-black text-orange-600">{margen} %</span>
              </div>
              <input
                type="range"
                min="10"
                max="80"
                value={margen}
                onChange={(e) => setMargen(Number(e.target.value))}
                className="w-full accent-orange-500"
              />
              <div className="mt-4 pt-4 border-t border-stone-100 flex justify-between items-baseline">
                <span className="text-sm text-stone-600">Tendrías que cobrar</span>
                <span className="text-2xl font-black">{bs(sugerido)}</span>
              </div>
            </div>

            {/* Punto de equilibrio: el indicador que nombra el objetivo 3 */}
            <PuntoEquilibrio productoId={seleccionado} costosFijos={costosFijos} />
          </div>
        </div>
      )}
    </div>
  );
};

// ── Punto de equilibrio ──────────────────────────────────────
// Objetivo específico 3. Se muestra el número y, al lado, la frase
// que lo explica: "punto de equilibrio: 82" no le dice nada a
// nadie; "tenés que vender 82 poleras al mes" sí.

const PuntoEquilibrio = ({ productoId, costosFijos }) => {
  const { equilibrio } = useOrdenes();

  if (!equilibrio) return null;

  const p = equilibrio.productos.find((x) => x.id === productoId);
  if (!p) return null;

  const pe = p.puntoEquilibrio;

  return (
    <div className="bg-white border border-stone-200 rounded-sm overflow-hidden">
      <div className="p-5 border-b border-stone-200">
        <div className="text-[11px] tracking-[0.2em] uppercase text-stone-500 mb-1">
          Cuánto tenés que vender
        </div>
        <h3 className="text-lg font-black tracking-tight">Punto de equilibrio</h3>
      </div>

      <div className="p-5 space-y-4">
        {equilibrio.aviso ? (
          <div className="bg-amber-50 border border-amber-200 rounded-sm p-3 text-sm text-amber-900">
            {equilibrio.aviso}
          </div>
        ) : (
          <>
            <div className="flex justify-between items-baseline text-sm">
              <span className="text-stone-600">Gastos fijos del taller</span>
              <span className="font-bold tabular-nums">
                {bs(equilibrio.costosFijosMensuales)} / mes
              </span>
            </div>

            <div className="flex justify-between items-baseline text-sm">
              <span className="text-stone-600">
                De cada venta te queda para cubrirlos
              </span>
              <span className="font-bold tabular-nums">
                {bs(p.margenContribucionUnitario)} ({p.razonContribucion.toFixed(0)} %)
              </span>
            </div>

            {pe.alcanzable ? (
              <div className="bg-stone-950 text-white p-5 rounded-sm">
                <div className="text-4xl font-black text-orange-400 tabular-nums">{pe.unidades}</div>
                <div className="text-sm text-stone-300 mt-1 leading-snug">{p.explicacion}</div>
                <div className="text-xs text-stone-500 mt-2">
                  Son {bs(pe.montoBs)} de ventas en el mes.
                </div>
              </div>
            ) : (
              <div className="bg-red-50 border-2 border-red-300 p-4 rounded-sm">
                <div className="font-black text-red-900 text-sm mb-1">
                  Con este precio no hay punto de equilibrio
                </div>
                <div className="text-sm text-red-800 leading-snug">{pe.motivo}</div>
                <div className="text-xs text-red-700 mt-2">
                  No es cuestión de vender más: cada prenda que sale te resta plata. Hay que subir el
                  precio o bajar el costo.
                </div>
              </div>
            )}

            {equilibrio.masFacil && equilibrio.masFacil.nombre !== p.nombre && (
              <div className="text-xs text-stone-500 leading-snug border-t border-stone-100 pt-3">
                Tu prenda más fácil de sostener es <strong>{equilibrio.masFacil.nombre}</strong>: con{' '}
                {equilibrio.masFacil.unidades} al mes ya cubrís todos los gastos fijos.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ── Auxiliares ───────────────────────────────────────────────

const Tarjeta = ({ titulo, valor, pie }) => (
  <div className="bg-white border border-stone-200 p-5 rounded-sm">
    <div className="text-[11px] tracking-[0.2em] uppercase text-stone-500 mb-2">{titulo}</div>
    <div className="text-3xl font-black tabular-nums">{valor}</div>
    <div className="text-xs text-stone-500 mt-1">{pie}</div>
  </div>
);

const IconBtn = ({ onClick, title, icon: Icon, peligro }) => (
  <button
    onClick={onClick}
    title={title}
    className={`p-1.5 rounded-sm text-stone-400 ${
      peligro ? 'hover:text-red-600 hover:bg-red-50' : 'hover:text-stone-900 hover:bg-stone-100'
    }`}
  >
    <Icon size={14} />
  </button>
);
