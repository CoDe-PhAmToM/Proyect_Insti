// ============================================================
// VISTA: Órdenes de producción
//
// El objetivo específico 3 de la tesis. La diferencia con el costeo
// por producto no es técnica: el costeo estándar dice "una polera
// debería costar 49,85"; esta pantalla dice "ESTAS 24 poleras
// costaron 2.407,66, o sea 100,32 cada una", porque la tela salió
// del inventario al precio que tenía ese día.
// ============================================================

import React, { useState } from 'react';
import {
  Plus, Play, CheckCircle2, XCircle, Package, Loader2, Trash2, AlertTriangle, TrendingDown,
} from 'lucide-react';
import { Modal, FormField, inputClass } from '../components/Modal';
import { Cargando, ErrorCarga, SinDatos } from '../components/Layout';
import { useOrdenes } from '../context/OrdenesContext';
import { useMateriales } from '../context/MaterialesContext';
import { useAuth } from '../context/AuthContext';
import { bs, fechaCorta, hoyISO } from 'shared/formato';
import { useAviso } from '../components/Aviso';

const ESTADO = {
  BORRADOR:   { label: 'Borrador',    clase: 'bg-stone-100 text-stone-700' },
  EN_PROCESO: { label: 'Haciéndose',  clase: 'bg-blue-100 text-blue-800' },
  TERMINADA:  { label: 'Terminada',   clase: 'bg-green-100 text-green-800' },
  ENTREGADA:  { label: 'Entregada',   clase: 'bg-stone-900 text-white' },
  CANCELADA:  { label: 'Cancelada',   clase: 'bg-red-100 text-red-800' },
};

export const Ordenes = () => {
  const { ordenes, resumen, cargando, error, recargar, crearOrden, cambiarEstado, borrarOrden, verCosteo } =
    useOrdenes();
  const { productos } = useMateriales();
  const { puedeVerCostos } = useAuth();
  const { mostrar } = useAviso();

  const [modalNueva, setModalNueva] = useState(false);
  const [detalleDe, setDetalleDe] = useState(null);
  const [terminando, setTerminando] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);
  const [ocupada, setOcupada] = useState(null);

  const accion = async (id, estado, cantidad) => {
    setOcupada(id);
    setErrorAccion(null);
    try {
      await cambiarEstado(id, estado, cantidad);
      mostrar(
        {
          EN_PROCESO: 'Orden arrancada. Se descontó el material del inventario.',
          TERMINADA: 'Orden terminada. Ya podés ver cuánto costó cada prenda.',
          ENTREGADA: 'Orden entregada.',
          CANCELADA: 'Orden cancelada. El material volvió al inventario.',
        }[estado] ?? 'Listo',
        estado === 'CANCELADA' ? 'info' : 'ok'
      );
      setTerminando(null);
    } catch (e) {
      setErrorAccion(e.message);
    } finally {
      setOcupada(null);
    }
  };

  if (cargando && ordenes.length === 0) return <Cargando texto="Cargando las órdenes..." />;
  if (error) return <ErrorCarga mensaje={error} onReintentar={recargar} />;

  return (
    <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">
      {errorAccion && (
        <div className="bg-red-50 border-2 border-red-200 text-red-800 text-sm rounded-sm p-4">
          {errorAccion}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Mini titulo="Órdenes" valor={resumen.total} />
        <Mini titulo="Sin arrancar" valor={resumen.borradores} />
        <Mini titulo="Haciéndose" valor={resumen.enProceso} color="text-blue-700" />
        <Mini titulo="Terminadas" valor={resumen.terminadas} color="text-green-700" />
      </div>

      <div className="bg-white border border-stone-200 rounded-sm overflow-hidden">
        <div className="p-5 border-b border-stone-200 flex flex-wrap gap-3 justify-between items-center">
          <div>
            <div className="text-[11px] tracking-[0.2em] uppercase text-stone-500 mb-1">Producción</div>
            <h2 className="text-xl font-black tracking-tight">Órdenes de producción</h2>
          </div>
          {puedeVerCostos && (
            <button
              onClick={() => setModalNueva(true)}
              className="flex items-center gap-1.5 bg-orange-500 text-stone-950 px-4 py-2.5 text-xs font-black rounded-sm hover:bg-orange-400"
            >
              <Plus size={14} /> NUEVA ORDEN
            </button>
          )}
        </div>

        {ordenes.length === 0 ? (
          <SinDatos
            titulo="Todavía no hay órdenes"
            texto="Una orden es un lote de prendas que vas a producir. Al arrancarla, el sistema descuenta la tela del inventario y va sumando lo que realmente costó."
          />
        ) : (
          <div className="divide-y divide-stone-100">
            {ordenes.map((o) => (
              <div key={o.id} className="p-5 hover:bg-stone-50">
                <div className="flex flex-wrap gap-4 justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-xs font-bold text-stone-500">
                        N° {o.numero}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-sm ${ESTADO[o.estado].clase}`}
                      >
                        {ESTADO[o.estado].label}
                      </span>
                      {o.clienteNombre && (
                        <span className="text-xs text-stone-500">para {o.clienteNombre}</span>
                      )}
                    </div>

                    <div className="font-semibold text-stone-900">
                      {o.prendas.map((p) => `${p.cantidad} ${p.nombre}`).join(' · ')}
                    </div>

                    <div className="text-[11px] text-stone-500 mt-0.5">
                      Pedida el {fechaCorta(o.fechaPedido)}
                      {o.cantidadProducida > 0 && ` · salieron ${o.cantidadProducida} buenas`}
                    </div>

                    {puedeVerCostos && o.costoTotal > 0 && (
                      <div className="flex gap-4 mt-2 text-xs">
                        <span className="text-stone-600">
                          Costó <strong>{bs(o.costoTotal)}</strong>
                        </span>
                        <span className="text-stone-600">
                          c/u <strong>{bs(o.costoUnitario)}</strong>
                        </span>
                        <span className={o.ganancia >= 0 ? 'text-green-700' : 'text-red-700'}>
                          {o.ganancia >= 0 ? 'Gana' : 'Pierde'}{' '}
                          <strong>{bs(Math.abs(o.ganancia))}</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {o.estado === 'BORRADOR' && (
                      <>
                        <Boton
                          onClick={() => accion(o.id, 'EN_PROCESO')}
                          cargando={ocupada === o.id}
                          icono={Play}
                          texto="ARRANCAR"
                        />
                        {puedeVerCostos && (
                          <button
                            onClick={() => borrarOrden(o.id)}
                            className="p-2 text-stone-300 hover:text-red-600 hover:bg-red-50 rounded-sm"
                            title="Borrar"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </>
                    )}

                    {o.estado === 'EN_PROCESO' && (
                      <>
                        <Boton
                          onClick={() => setTerminando(o)}
                          icono={CheckCircle2}
                          texto="TERMINAR"
                        />
                        {puedeVerCostos && (
                          <button
                            onClick={() => accion(o.id, 'CANCELADA')}
                            className="p-2 text-stone-300 hover:text-red-600 hover:bg-red-50 rounded-sm"
                            title="Cancelar y devolver material"
                          >
                            <XCircle size={15} />
                          </button>
                        )}
                      </>
                    )}

                    {o.estado === 'TERMINADA' && puedeVerCostos && (
                      <Boton
                        onClick={() => accion(o.id, 'ENTREGADA')}
                        cargando={ocupada === o.id}
                        icono={Package}
                        texto="ENTREGAR"
                      />
                    )}

                    {puedeVerCostos && ['EN_PROCESO', 'TERMINADA', 'ENTREGADA'].includes(o.estado) && (
                      <button
                        onClick={() => setDetalleDe(o)}
                        className="px-3 py-2 text-xs font-bold text-stone-600 border border-stone-200 rounded-sm hover:bg-stone-100"
                      >
                        VER COSTO
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ModalNuevaOrden
        open={modalNueva}
        onClose={() => setModalNueva(false)}
        productos={productos}
        onCrear={async (datos) => {
          await crearOrden(datos);
          setModalNueva(false);
        }}
      />

      <ModalTerminar
        orden={terminando}
        onClose={() => setTerminando(null)}
        onConfirmar={(cantidad) => accion(terminando.id, 'TERMINADA', cantidad)}
      />

      <ModalCosteo orden={detalleDe} onClose={() => setDetalleDe(null)} verCosteo={verCosteo} />
    </div>
  );
};

// ── Modal: nueva orden ───────────────────────────────────────

const ModalNuevaOrden = ({ open, onClose, productos, onCrear }) => {
  const [cliente, setCliente] = useState('');
  const [fecha, setFecha] = useState(hoyISO());
  const [lineas, setLineas] = useState([{ productoId: '', cantidad: '' }]);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  React.useEffect(() => {
    if (open) {
      setCliente('');
      setFecha(hoyISO());
      setLineas([{ productoId: '', cantidad: '' }]);
      setError(null);
    }
  }, [open]);

  const setLinea = (i, campo, valor) =>
    setLineas((ls) => ls.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)));

  const crear = async () => {
    const detalles = lineas
      .filter((l) => l.productoId && Number(l.cantidad) > 0)
      .map((l) => ({ productoId: l.productoId, cantidad: Number(l.cantidad) }));

    if (detalles.length === 0) {
      setError('Elegí al menos una prenda y cuántas vas a hacer');
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      await onCrear({ clienteNombre: cliente || null, fechaPedido: fecha, detalles });
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nueva orden de producción" subtitulo="Qué vas a hacer" wide>
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-800 text-sm rounded-sm p-3">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField label="¿Para quién? (opcional)">
            <input
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              placeholder="Colegio Don Bosco"
              className={inputClass}
            />
          </FormField>
          <FormField label="Fecha del pedido">
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={inputClass}
            />
          </FormField>
        </div>

        <FormField label="¿Qué prendas y cuántas?">
          <div className="space-y-2">
            {lineas.map((l, i) => (
              <div key={i} className="flex gap-2">
                <select
                  value={l.productoId}
                  onChange={(e) => setLinea(i, 'productoId', e.target.value)}
                  className={`${inputClass} flex-1`}
                >
                  <option value="">Elegí una prenda...</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={l.cantidad}
                  onChange={(e) => setLinea(i, 'cantidad', e.target.value)}
                  placeholder="cuántas"
                  className={`${inputClass} w-28`}
                />
                {lineas.length > 1 && (
                  <button
                    onClick={() => setLineas((ls) => ls.filter((_, idx) => idx !== i))}
                    className="px-2 text-stone-400 hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => setLineas((ls) => [...ls, { productoId: '', cantidad: '' }])}
              className="text-xs font-bold text-stone-600 hover:text-stone-900 underline"
            >
              + Agregar otra prenda
            </button>
          </div>
        </FormField>

        <div className="bg-stone-50 border border-stone-200 rounded-sm p-3 text-xs text-stone-600">
          La orden se crea sin tocar el inventario. Cuando le des <strong>arrancar</strong>, ahí sí se
          descuenta la tela y los insumos.
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border-2 border-stone-200 rounded-sm text-sm font-bold text-stone-600"
          >
            Cancelar
          </button>
          <button
            onClick={crear}
            disabled={guardando}
            className="flex-1 py-3 bg-stone-900 text-white rounded-sm text-sm font-black hover:bg-stone-800 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {guardando && <Loader2 size={15} className="animate-spin" />}
            CREAR ORDEN
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ── Modal: terminar ──────────────────────────────────────────

const ModalTerminar = ({ orden, onClose, onConfirmar }) => {
  const [cantidad, setCantidad] = useState('');

  React.useEffect(() => {
    if (orden) setCantidad(String(orden.cantidadPlanificada));
  }, [orden]);

  const planificadas = orden?.cantidadPlanificada ?? 0;
  const salieron = Number(cantidad) || 0;
  const merma = planificadas - salieron;

  return (
    <Modal open={!!orden} onClose={onClose} title="Terminar la orden" subtitulo={`N° ${orden?.numero}`}>
      <div className="space-y-4">
        <FormField label="¿Cuántas prendas salieron bien?">
          <input
            type="number"
            min="0"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            className={`${inputClass} text-lg font-bold`}
          />
          <p className="text-[11px] text-stone-500 mt-1">
            Ibas a hacer {planificadas}. Poné cuántas quedaron vendibles.
          </p>
        </FormField>

        {merma > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-sm p-3 flex items-start gap-2 text-xs text-amber-900">
            <TrendingDown size={14} className="mt-0.5 shrink-0" />
            <span>
              {merma} prenda{merma !== 1 ? 's' : ''} se perdió en el camino. El sistema lo anota: saber
              cuánto se arruina es parte de conocer el costo real.
            </span>
          </div>
        )}

        <div className="bg-stone-50 border border-stone-200 rounded-sm p-3 text-xs text-stone-600">
          Al terminar, el sistema reparte el alquiler y la luz del mes entre todas las prendas
          producidas, y recién ahí sabés el costo real de cada una.
        </div>

        <button
          onClick={() => onConfirmar(salieron)}
          disabled={salieron <= 0}
          className="w-full py-3 bg-stone-900 text-white rounded-sm text-sm font-black hover:bg-stone-800 disabled:opacity-50"
        >
          TERMINAR ORDEN
        </button>
      </div>
    </Modal>
  );
};

// ── Modal: costeo real ───────────────────────────────────────

const ModalCosteo = ({ orden, onClose, verCosteo }) => {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);

  React.useEffect(() => {
    if (!orden) return setDatos(null);
    setCargando(true);
    verCosteo(orden.id)
      .then(setDatos)
      .finally(() => setCargando(false));
  }, [orden, verCosteo]);

  const c = datos?.costeo;
  const v = datos?.venta;

  return (
    <Modal
      open={!!orden}
      onClose={onClose}
      title={`Costo real de la orden N° ${orden?.numero ?? ''}`}
      subtitulo="Lo que costó de verdad"
      wide
    >
      {cargando && <div className="py-8 text-center text-sm text-stone-500">Calculando...</div>}

      {datos && (
        <div className="space-y-5">
          <table className="w-full text-sm">
            <tbody>
              <Fila label="Materiales que se usaron" valor={c.costoMateriales} />
              <Fila label="Mano de obra" valor={c.costoManoObra} />
              <Fila label="Luz, alquiler y agua" valor={c.costoCif} />
              <tr className="border-t-2 border-stone-300">
                <td className="py-3 font-black">Costo total</td>
                <td className="py-3 text-right font-black tabular-nums">{bs(c.costoTotal)}</td>
              </tr>
            </tbody>
          </table>

          <div className="bg-stone-950 text-white p-5 rounded-sm">
            <div className="text-[11px] tracking-[0.2em] uppercase text-stone-400 mb-1">
              Cada prenda te costó
            </div>
            <div className="text-3xl font-black text-orange-400">{bs(c.costoUnitario)}</div>
            <div className="text-xs text-stone-400 mt-1">
              {c.cantidadProducida} prenda{c.cantidadProducida !== 1 ? 's' : ''} producida
              {c.cantidadProducida !== 1 ? 's' : ''}
            </div>

            <div className="mt-4 pt-4 border-t border-stone-800 flex justify-between items-baseline">
              <span className="text-sm text-stone-400">Las vendés a</span>
              <span className="font-bold">{bs(v.unitario)} c/u</span>
            </div>
            <div className="flex justify-between items-baseline mt-1">
              <span className="text-sm text-stone-400">
                {v.gananciaTotal >= 0 ? 'Ganás' : 'Perdés'}
              </span>
              <span
                className={`text-xl font-black ${v.gananciaTotal >= 0 ? 'text-green-400' : 'text-red-400'}`}
              >
                {bs(Math.abs(v.gananciaTotal))}
              </span>
            </div>
          </div>

          {/* Por qué el gasto indirecto pesa lo que pesa */}
          {datos.prorrateo?.aviso && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-sm p-4 flex items-start gap-3">
              <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm text-amber-900">{datos.prorrateo.aviso}</div>
            </div>
          )}

          {datos.merma?.unidades > 0 && (
            <div className="bg-stone-50 border border-stone-200 rounded-sm p-3 text-xs text-stone-600">
              Se perdieron {datos.merma.unidades} prenda{datos.merma.unidades !== 1 ? 's' : ''} en el
              camino, que representan {bs(datos.merma.costo)} de material y trabajo.
            </div>
          )}

          <details className="text-sm">
            <summary className="cursor-pointer font-bold text-stone-700 hover:text-stone-900">
              Ver el detalle de cada gasto
            </summary>
            <table className="w-full mt-3 text-xs">
              <tbody>
                {datos.costos.map((x) => (
                  <tr key={x.id} className="border-b border-stone-100">
                    <td className="py-2 text-stone-600">{x.descripcion}</td>
                    <td className="py-2 text-right tabular-nums font-semibold">
                      {bs(x.monto, { simbolo: false })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </div>
      )}
    </Modal>
  );
};

// ── Auxiliares ───────────────────────────────────────────────

const Fila = ({ label, valor }) => (
  <tr className="border-b border-stone-100">
    <td className="py-2.5 text-stone-600">{label}</td>
    <td className="py-2.5 text-right tabular-nums font-semibold">{bs(valor)}</td>
  </tr>
);

const Mini = ({ titulo, valor, color = 'text-stone-900' }) => (
  <div className="bg-white border border-stone-200 p-4 rounded-sm">
    <div className="text-[11px] tracking-[0.15em] uppercase text-stone-500 mb-1">{titulo}</div>
    <div className={`text-2xl font-black ${color}`}>{valor}</div>
  </div>
);

const Boton = ({ onClick, cargando, icono: Icono, texto }) => (
  <button
    onClick={onClick}
    disabled={cargando}
    className="flex items-center gap-1.5 bg-stone-900 text-white px-3 py-2 text-xs font-black rounded-sm hover:bg-stone-800 disabled:opacity-50"
  >
    {cargando ? <Loader2 size={13} className="animate-spin" /> : <Icono size={13} />}
    {texto}
  </button>
);
