// ============================================================
// VISTA: Ingresos, egresos y retiros v3.0
//
// El formulario calca el cuaderno de papel: fecha, prenda,
// cantidad, precio. No es estética — un indicador de la tesis mide
// cuántos campos del sistema coinciden con los que el
// microempresario ya anota a mano.
//
// v3: tres tipos de movimiento. El RETIRO (plata que el dueño saca
// para la casa) se mide aparte porque la fórmula del documento es
// ingresos − egresos − retiros.
// ============================================================

import React, { useState, useMemo } from 'react';
import {
  Plus, TrendingUp, TrendingDown, AlertTriangle, Wallet, Trash2, X, Loader2, Ban,
} from 'lucide-react';
import { Modal, FormField, inputClass } from '../components/Modal';
import { Cargando, ErrorCarga, SinDatos } from '../components/Layout';
import { useRegistros } from '../context/RegistrosContext';
import { useMateriales } from '../context/MaterialesContext';
import { useAuth } from '../context/AuthContext';
import { bs, fechaCorta, hoyISO } from 'shared/formato';
import { cronometrar } from '../lib/bitacora';
import { FiltroPeriodo } from '../components/FiltroPeriodo';

const TIPOS = [
  { id: 'INGRESO', label: 'Entró plata', ayuda: 'Una venta, un pedido cobrado', color: 'green' },
  { id: 'EGRESO',  label: 'Salió plata', ayuda: 'Tela, hilos, luz, ayudantes', color: 'red' },
  { id: 'RETIRO',  label: 'Saqué para mí', ayuda: 'Gastos de la casa, del colegio', color: 'amber' },
];

const FORM_VACIO = {
  fecha: hoyISO(),
  tipo: 'INGRESO',
  categoriaId: '',
  descripcion: '',
  monto: '',
  productoId: '',
  cantidad: '',
  precioUnitario: '',
};

export const Registros = () => {
  const {
    registros, categorias, cargando, error, recargar,
    agregarRegistro, eliminarRegistro, anularRegistro,
    filtroFechas, setFiltroFechas,
    ingresos, egresos, retiros, mezclaPersonal, gananciaReal, gananciaSinMezcla,
  } = useRegistros();
  const { productos } = useMateriales();
  const { puedeVerCostos } = useAuth();

  const [filtro, setFiltro] = useState('todos');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [errores, setErrores] = useState({});
  const [errorEnvio, setErrorEnvio] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [aEliminar, setAEliminar] = useState(null);
  const [aAnular, setAAnular] = useState(null);
  const [motivoAnular, setMotivoAnular] = useState('');

  const filtrados = useMemo(
    () =>
      registros.filter((r) => {
        if (filtro === 'todos') return true;
        if (filtro === 'ingresos') return r.tipo === 'INGRESO';
        if (filtro === 'egresos') return r.tipo === 'EGRESO';
        if (filtro === 'personal') return r.tipo === 'RETIRO' || r.origen === 'PERSONAL';
        return true;
      }),
    [registros, filtro]
  );

  const catsDelTipo = categorias[form.tipo] ?? [];

  // El cronómetro mide cuánto tarda en cargar un movimiento. Es el
  // indicador de curva de aprendizaje que pide la tesis: semana 1
  // contra semana 3.
  const relojRef = React.useRef(null);

  const abrirModal = () => {
    setForm({ ...FORM_VACIO, fecha: hoyISO() });
    setErrores({});
    setErrorEnvio(null);
    setModalAbierto(true);
    relojRef.current = cronometrar();
  };

  const cambiarTipo = (tipo) =>
    setForm((f) => ({ ...f, tipo, categoriaId: '', productoId: '', cantidad: '', precioUnitario: '' }));

  // Si carga prenda, cantidad y precio, el monto se calcula solo:
  // menos cuentas de cabeza, menos errores de tipeo.
  const setCantidadOPrecio = (campo) => (e) => {
    const v = e.target.value;
    setForm((f) => {
      const next = { ...f, [campo]: v };
      const c = Number(campo === 'cantidad' ? v : next.cantidad);
      const p = Number(campo === 'precioUnitario' ? v : next.precioUnitario);
      if (c > 0 && p > 0) next.monto = String(Number((c * p).toFixed(2)));
      return next;
    });
  };

  const guardar = async () => {
    const errs = {};
    if (!form.descripcion.trim()) errs.descripcion = 'Escribí qué fue este movimiento';
    if (!form.monto || Number(form.monto) <= 0) errs.monto = 'El monto tiene que ser mayor a 0';
    if (!form.fecha) errs.fecha = 'Elegí una fecha';
    if (!form.categoriaId) errs.categoriaId = 'Elegí una categoría';
    setErrores(errs);
    if (Object.keys(errs).length) return;

    setGuardando(true);
    setErrorEnvio(null);
    try {
      await agregarRegistro({
        fecha: form.fecha,
        tipo: form.tipo,
        categoriaId: form.categoriaId,
        descripcion: form.descripcion.trim(),
        monto: Number(form.monto),
        origen: form.tipo === 'RETIRO' ? 'PERSONAL' : 'NEGOCIO',
        productoId: form.productoId || null,
        cantidad: form.cantidad ? Number(form.cantidad) : null,
        precioUnitario: form.precioUnitario ? Number(form.precioUnitario) : null,
      });
      relojRef.current?.fin('registro_creado', {
        entidad: 'registro',
        metadata: {
          tipo: form.tipo,
          conPrenda: Boolean(form.productoId),
          conCantidad: Boolean(form.cantidad),
        },
      });
      setModalAbierto(false);
    } catch (e) {
      setErrorEnvio(e.message);
      setErrores(e.detalles ?? {});
    } finally {
      setGuardando(false);
    }
  };

  if (cargando && registros.length === 0) return <Cargando texto="Cargando tus movimientos..." />;
  if (error) return <ErrorCarga mensaje={error} onReintentar={recargar} />;

  return (
    <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">
      {/* Alerta de mezcla — el corazón del objetivo 4 */}
      {mezclaPersonal > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-sm p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm">
            <div className="font-black text-amber-900 mb-0.5">
              Sacaste {bs(mezclaPersonal)} de la caja del negocio para gastos de la casa
            </div>
            {puedeVerCostos && (
              <div className="text-amber-800">
                Tu ganancia real es <strong>{bs(gananciaReal)}</strong>. Si no hubieras mezclado,
                sería <strong>{bs(gananciaSinMezcla)}</strong>.
              </div>
            )}
          </div>
        </div>
      )}

      <FiltroPeriodo valor={filtroFechas} onCambiar={setFiltroFechas} />

      {/* Totales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tarjeta icono={TrendingUp} color="text-green-600" valor={bs(ingresos)} label="Entró" />
        <Tarjeta icono={TrendingDown} color="text-red-600" valor={bs(egresos)} label="Salió" />
        <Tarjeta icono={Wallet} color="text-amber-600" valor={bs(retiros)} label="Saqué para mí" />
        {puedeVerCostos && (
          <div className="bg-stone-900 text-white p-5 rounded-sm">
            <div className="text-[11px] uppercase tracking-wider text-stone-400 mb-2">
              Ganancia real
            </div>
            <div
              className={`text-2xl font-black ${gananciaReal >= 0 ? 'text-green-400' : 'text-red-400'}`}
            >
              {bs(gananciaReal)}
            </div>
          </div>
        )}
      </div>

      {/* Lista */}
      <div className="bg-white border border-stone-200 rounded-sm overflow-hidden">
        <div className="p-5 border-b border-stone-200 flex flex-wrap gap-3 justify-between items-center">
          <div className="flex gap-1.5 flex-wrap">
            {[
              ['todos', 'Todos'],
              ['ingresos', 'Entró'],
              ['egresos', 'Salió'],
              ['personal', 'Personal'],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setFiltro(id)}
                className={`px-3 py-1.5 rounded-sm text-xs font-bold ${
                  filtro === id ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={abrirModal}
            className="flex items-center gap-1.5 bg-orange-500 text-stone-950 px-4 py-2.5 text-xs font-black rounded-sm hover:bg-orange-400"
          >
            <Plus size={14} /> ANOTAR MOVIMIENTO
          </button>
        </div>

        {filtrados.length === 0 ? (
          <SinDatos
            titulo="Todavía no hay nada anotado"
            texto="Empezá anotando una venta o una compra de tela. Con eso el sistema ya puede calcular tu ganancia."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[46rem]">
              <thead className="bg-stone-50">
                <tr className="text-left text-[11px] tracking-[0.15em] uppercase text-stone-500">
                  <th className="px-5 py-3 font-medium">Fecha</th>
                  <th className="px-5 py-3 font-medium">Qué fue</th>
                  <th className="px-5 py-3 font-medium">Categoría</th>
                  <th className="px-5 py-3 font-medium text-right">Cantidad</th>
                  <th className="px-5 py-3 font-medium text-right">Monto</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((r) => (
                  <tr
                    key={r.id}
                    className={`border-b border-stone-100 hover:bg-stone-50 ${
                      r.anuladoEn ? 'opacity-50' : r.tipo === 'RETIRO' ? 'bg-amber-50/40' : ''
                    }`}
                  >
                    <td className="px-5 py-3 text-stone-500 whitespace-nowrap">
                      {fechaCorta(r.fecha)}
                    </td>
                    <td className="px-5 py-3">
                      <div className={`font-semibold text-stone-800 ${r.anuladoEn ? 'line-through' : ''}`}>
                        {r.descripcion}
                      </div>
                      {r.anuladoEn && (
                        <div className="text-[11px] text-red-700 font-bold">
                          ANULADO — {r.motivoAnulacion}
                        </div>
                      )}
                      {r.producto && (
                        <div className="text-[11px] text-stone-500">{r.producto.nombre}</div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-stone-500 text-xs">{r.categoria?.nombre}</td>
                    <td className="px-5 py-3 text-right text-stone-500 tabular-nums text-xs">
                      {r.cantidad ? `${r.cantidad} × ${bs(r.precioUnitario, { simbolo: false })}` : '—'}
                    </td>
                    <td
                      className={`px-5 py-3 text-right font-bold tabular-nums whitespace-nowrap ${
                        r.tipo === 'INGRESO'
                          ? 'text-green-700'
                          : r.tipo === 'RETIRO'
                            ? 'text-amber-700'
                            : 'text-red-700'
                      }`}
                    >
                      {r.tipo === 'INGRESO' ? '+' : '−'} {bs(r.monto, { simbolo: false })}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      {!r.anuladoEn && (
                        <button
                          onClick={() => {
                            setAAnular(r);
                            setMotivoAnular('');
                          }}
                          className="p-1.5 text-stone-300 hover:text-amber-700 hover:bg-amber-50 rounded-sm"
                          title="Anular (queda el registro)"
                        >
                          <Ban size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => setAEliminar(r)}
                        className="p-1.5 text-stone-300 hover:text-red-600 hover:bg-red-50 rounded-sm"
                        title="Borrar (solo lo de hoy)"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: nuevo movimiento */}
      <Modal
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        title="Anotar un movimiento"
        subtitulo="Como en tu cuaderno"
        wide
      >
        <div className="space-y-5">
          {errorEnvio && (
            <div className="bg-red-50 border-2 border-red-200 text-red-800 text-sm rounded-sm p-3">
              {errorEnvio}
            </div>
          )}

          <FormField label="¿Qué pasó?">
            <div className="grid grid-cols-3 gap-2">
              {TIPOS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => cambiarTipo(t.id)}
                  className={`p-3 rounded-sm border-2 text-left transition-colors ${
                    form.tipo === t.id
                      ? t.color === 'green'
                        ? 'bg-green-50 border-green-500'
                        : t.color === 'red'
                          ? 'bg-red-50 border-red-500'
                          : 'bg-amber-50 border-amber-500'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="font-bold text-sm text-stone-900">{t.label}</div>
                  <div className="text-[11px] text-stone-500 leading-snug mt-0.5">{t.ayuda}</div>
                </button>
              ))}
            </div>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Fecha">
              <input
                type="date"
                value={form.fecha}
                max={hoyISO()}
                onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
                className={inputClass}
              />
              {errores.fecha && <p className="text-xs text-red-600 mt-1">{errores.fecha}</p>}
            </FormField>

            <FormField label="Categoría">
              <select
                value={form.categoriaId}
                onChange={(e) => setForm((f) => ({ ...f, categoriaId: e.target.value }))}
                className={inputClass}
              >
                <option value="">Elegí una...</option>
                {catsDelTipo.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              {errores.categoriaId && (
                <p className="text-xs text-red-600 mt-1">{errores.categoriaId}</p>
              )}
            </FormField>
          </div>

          <FormField label="¿Qué fue?">
            <input
              value={form.descripcion}
              onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
              placeholder="Venta 3 poleras negras talla M"
              className={inputClass}
            />
            {errores.descripcion && (
              <p className="text-xs text-red-600 mt-1">{errores.descripcion}</p>
            )}
          </FormField>

          {/* Prenda / cantidad / precio: los campos del cuaderno */}
          {form.tipo === 'INGRESO' && (
            <div className="bg-stone-50 border border-stone-200 rounded-sm p-4 space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                Si fue venta de prendas (opcional)
              </div>
              <div className="grid grid-cols-3 gap-3">
                <FormField label="Prenda">
                  <select
                    value={form.productoId}
                    onChange={(e) => setForm((f) => ({ ...f, productoId: e.target.value }))}
                    className={inputClass}
                  >
                    <option value="">—</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Cantidad">
                  <input
                    type="number"
                    min="0"
                    value={form.cantidad}
                    onChange={setCantidadOPrecio('cantidad')}
                    className={inputClass}
                  />
                </FormField>
                <FormField label="Precio c/u">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.precioUnitario}
                    onChange={setCantidadOPrecio('precioUnitario')}
                    className={inputClass}
                  />
                </FormField>
              </div>
            </div>
          )}

          <FormField label="Monto total (Bs.)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.monto}
              onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
              className={`${inputClass} text-lg font-bold`}
            />
            {errores.monto && <p className="text-xs text-red-600 mt-1">{errores.monto}</p>}
          </FormField>

          {form.tipo === 'RETIRO' && (
            <div className="bg-amber-50 border border-amber-200 rounded-sm p-3 text-xs text-amber-900">
              Anotar lo que sacás para la casa no es un castigo: es lo que permite saber cuánto gana
              el taller de verdad.
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={() => setModalAbierto(false)}
              className="flex-1 py-3 border-2 border-stone-200 rounded-sm text-sm font-bold text-stone-600 hover:bg-stone-50"
            >
              Cancelar
            </button>
            <button
              onClick={guardar}
              disabled={guardando}
              className="flex-1 py-3 bg-stone-900 text-white rounded-sm text-sm font-black hover:bg-stone-800 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {guardando ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> GUARDANDO
                </>
              ) : (
                'GUARDAR'
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Anular: la forma correcta de corregir un error */}
      <Modal
        open={!!aAnular}
        onClose={() => setAAnular(null)}
        title="Anular este movimiento"
        subtitulo="Corregir sin borrar"
      >
        <div className="space-y-4">
          <div className="bg-stone-50 border border-stone-200 rounded-sm p-3 text-sm">
            <div className="font-bold text-stone-900">{aAnular?.descripcion}</div>
            <div className="text-stone-500">{bs(aAnular?.monto)}</div>
          </div>

          <p className="text-sm text-stone-600 leading-relaxed">
            El movimiento deja de contar en tus totales, pero <strong>no se borra</strong>: queda
            tachado en la lista con el motivo. Así siempre se puede ver qué pasó.
          </p>

          <FormField label="¿Por qué lo anulás?">
            <input
              value={motivoAnular}
              onChange={(e) => setMotivoAnular(e.target.value)}
              placeholder="Me equivoqué en el monto"
              className={inputClass}
            />
          </FormField>

          <div className="flex gap-3">
            <button
              onClick={() => setAAnular(null)}
              className="flex-1 py-2.5 border-2 border-stone-200 rounded-sm text-sm font-bold"
            >
              Cancelar
            </button>
            <button
              onClick={async () => {
                await anularRegistro(aAnular.id, motivoAnular);
                setAAnular(null);
              }}
              disabled={motivoAnular.trim().length < 3}
              className="flex-1 py-2.5 bg-amber-600 text-white rounded-sm text-sm font-black hover:bg-amber-700 disabled:opacity-50"
            >
              ANULAR
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirmación de borrado */}
      <Modal open={!!aEliminar} onClose={() => setAEliminar(null)} title="¿Borrar este movimiento?">
        <div className="space-y-4">
          <p className="text-sm text-stone-600">
            Vas a borrar <strong>{aEliminar?.descripcion}</strong> por{' '}
            <strong>{bs(aEliminar?.monto)}</strong>. Esto no se puede deshacer.
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
                await eliminarRegistro(aEliminar.id);
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

const Tarjeta = ({ icono: Icono, color, valor, label }) => (
  <div className="bg-white border border-stone-200 p-5 rounded-sm">
    <Icono size={16} className={`${color} mb-3`} />
    <div className="text-2xl font-black text-stone-900 mb-1 tabular-nums">{valor}</div>
    <div className="text-[11px] text-stone-500 uppercase tracking-wider">{label}</div>
  </div>
);
