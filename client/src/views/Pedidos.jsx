// ============================================================
// VISTAS: Pedidos
//
// Dos pantallas, un mismo archivo:
//   PedidosTaller  — lo que le encargaron al productor
//   MisPedidos     — lo que encargó el cliente
//
// Acá se cierra el circuito que integra la tienda a la tesis:
// confirmar un pedido crea una orden de producción real, y
// entregarlo registra el ingreso.
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Inbox, Check, X, Package, Loader2, ArrowRight, Clock, QrCode, Eye,
} from 'lucide-react';
import { api } from '../lib/api';
import { Cargando, ErrorCarga, SinDatos } from '../components/Layout';
import { bs, fechaCorta } from 'shared/formato';
import { ModalPago, ModalMiQR, EtiquetaPago } from '../components/PagoQR';
import { Modal } from '../components/Modal';

const ESTADO = {
  NUEVO:         { label: 'Nuevo',          clase: 'bg-orange-100 text-orange-800' },
  CONFIRMADO:    { label: 'Confirmado',     clase: 'bg-blue-100 text-blue-800' },
  EN_PRODUCCION: { label: 'Haciéndose',     clase: 'bg-blue-100 text-blue-800' },
  LISTO:         { label: 'Listo',          clase: 'bg-green-100 text-green-800' },
  ENTREGADO:     { label: 'Entregado',      clase: 'bg-stone-900 text-white' },
  CANCELADO:     { label: 'Cancelado',      clase: 'bg-red-100 text-red-800' },
};

// ══════════════════════════════════════════════════════════════
// LADO DEL TALLER
// ══════════════════════════════════════════════════════════════

export const PedidosTaller = () => {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [ocupado, setOcupado] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [qrAbierto, setQrAbierto] = useState(false);
  const [comprobante, setComprobante] = useState(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setDatos(await api.get('/pedidos'));
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const accion = async (id, ruta) => {
    setOcupado(id);
    setAviso(null);
    try {
      const r = await api.post(`/pedidos/${id}/${ruta}`);
      if (r.mensaje) setAviso(r.mensaje);
      await cargar();
    } catch (e) {
      setAviso(e.message);
    } finally {
      setOcupado(null);
    }
  };

  if (cargando) return <Cargando texto="Cargando los pedidos..." />;
  if (error) return <ErrorCarga mensaje={error} onReintentar={cargar} />;

  const { pedidos, resumen } = datos;

  return (
    <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">
      {aviso && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-sm p-4 flex items-start gap-3 text-sm">
          <div className="flex-1 text-blue-900">{aviso}</div>
          <button onClick={() => setAviso(null)} className="text-blue-500 hover:text-blue-800">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-3 justify-between items-center">
        <div className="grid grid-cols-3 gap-3 sm:gap-4 flex-1 min-w-[16rem]">
          <Mini titulo="Nuevos" valor={resumen.nuevos} color="text-orange-700" />
          <Mini titulo="Haciéndose" valor={resumen.enProduccion} color="text-blue-700" />
          <Mini titulo="Total" valor={resumen.total} />
        </div>
        <button
          onClick={() => setQrAbierto(true)}
          className="flex items-center gap-1.5 border-2 border-stone-300 px-4 py-2.5 text-xs font-bold rounded-sm hover:bg-stone-100 shrink-0"
        >
          <QrCode size={14} /> MI QR DE COBRO
        </button>
      </div>

      {pedidos.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-sm">
          <SinDatos
            titulo="Todavía no te hicieron pedidos"
            texto="Cuando alguien compre desde el catálogo, el pedido va a aparecer acá. Para que la tienda muestre tus prendas, marcalas como publicadas."
          />
        </div>
      ) : (
        <div className="space-y-3">
          {pedidos.map((p) => (
            <div key={p.id} className="bg-white border border-stone-200 rounded-sm p-5">
              <div className="flex flex-wrap gap-4 justify-between items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="font-mono text-xs font-bold text-stone-500">N° {p.numero}</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-sm ${ESTADO[p.estado].clase}`}>
                      {ESTADO[p.estado].label}
                    </span>
                    <EtiquetaPago estado={p.estadoPago} />
                    {p.orden && (
                      <span className="text-[11px] text-stone-500">
                        → orden N° {p.orden.numero}
                      </span>
                    )}
                  </div>

                  <div className="font-black text-stone-900">{p.cliente.nombre}</div>
                  <div className="text-xs text-stone-500 mb-2">
                    {fechaCorta(p.creadoEn)}
                    {p.telefonoContacto && ` · ${p.telefonoContacto}`}
                  </div>

                  <div className="space-y-1.5">
                    {p.items.map((i) => (
                      <div key={i.id} className="flex items-center gap-2.5 text-sm">
                        {i.estampadoUrl ? (
                          <img
                            src={i.estampadoUrl}
                            alt=""
                            className="w-9 h-9 object-contain bg-stone-100 rounded-sm shrink-0"
                          />
                        ) : (
                          <div
                            className="w-9 h-9 rounded-sm shrink-0 border border-stone-200"
                            style={{ backgroundColor: i.colorHex ?? '#e7e5e4' }}
                          />
                        )}
                        <div className="min-w-0">
                          <span className="font-semibold">
                            {i.cantidad} × {i.producto.nombre}
                          </span>
                          <span className="text-stone-500 text-xs ml-2">
                            {[i.color, i.talla && `talla ${i.talla}`, i.estampadoUrl && 'con estampado']
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {p.direccionEntrega && (
                    <div className="text-xs text-stone-500 mt-2">Entregar en: {p.direccionEntrega}</div>
                  )}
                  {p.notas && <div className="text-xs text-stone-600 mt-1 italic">"{p.notas}"</div>}
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="text-xl font-black tabular-nums">{bs(p.total)}</div>

                  {p.comprobanteUrl && p.estadoPago === 'COMPROBANTE_SUBIDO' && (
                    <button
                      onClick={() => setComprobante(p)}
                      className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 text-xs font-black rounded-sm hover:bg-blue-700"
                    >
                      <Eye size={13} /> VER COMPROBANTE
                    </button>
                  )}

                  {p.estado === 'NUEVO' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => accion(p.id, 'confirmar')}
                        disabled={ocupado === p.id}
                        className="flex items-center gap-1.5 bg-stone-900 text-white px-3 py-2 text-xs font-black rounded-sm hover:bg-stone-800 disabled:opacity-50"
                      >
                        {ocupado === p.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <ArrowRight size={13} />
                        )}
                        ACEPTAR
                      </button>
                      <button
                        onClick={() => accion(p.id, 'cancelar')}
                        className="p-2 text-stone-300 hover:text-red-600 hover:bg-red-50 rounded-sm"
                        title="Rechazar"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  )}

                  {['EN_PRODUCCION', 'CONFIRMADO', 'LISTO'].includes(p.estado) && (
                    <button
                      onClick={() => accion(p.id, 'entregar')}
                      disabled={ocupado === p.id}
                      className="flex items-center gap-1.5 bg-orange-500 text-stone-950 px-3 py-2 text-xs font-black rounded-sm hover:bg-orange-400 disabled:opacity-50"
                    >
                      {ocupado === p.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Check size={13} />
                      )}
                      ENTREGAR Y COBRAR
                    </button>
                  )}
                </div>
              </div>

              {p.estado === 'NUEVO' && (
                <div className="mt-3 pt-3 border-t border-stone-100 text-[11px] text-stone-500">
                  Al aceptar se crea una orden de producción con estas prendas, y el costo se calcula
                  solo.
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ModalMiQR open={qrAbierto} onClose={() => setQrAbierto(false)} onGuardado={cargar} />

      {/* Revisar el comprobante que subió el cliente */}
      <Modal
        open={!!comprobante}
        onClose={() => setComprobante(null)}
        title="Comprobante de pago"
        subtitulo={comprobante ? `Pedido N° ${comprobante.numero}` : ''}
      >
        {comprobante && (
          <div className="space-y-4">
            <div className="bg-stone-50 border border-stone-200 rounded-sm p-3 flex justify-between text-sm">
              <span className="text-stone-600">Debería decir</span>
              <span className="font-black">{bs(comprobante.total)}</span>
            </div>

            <img
              src={comprobante.comprobanteUrl}
              alt="Comprobante"
              className="w-full rounded-sm border border-stone-200"
            />

            {comprobante.notaPago && (
              <div className="text-sm text-stone-600 italic">{comprobante.notaPago}</div>
            )}

            <p className="text-xs text-stone-500">
              Verificá en tu app del banco que la plata haya entrado antes de confirmar. El sistema
              no se conecta a tu cuenta.
            </p>

            <div className="flex gap-3">
              <button
                onClick={async () => {
                  await api.post(`/pedidos/${comprobante.id}/confirmar-pago`, { aprueba: false });
                  setComprobante(null);
                  cargar();
                }}
                className="flex-1 py-3 border-2 border-stone-200 rounded-sm text-sm font-bold text-stone-600"
              >
                No me llegó
              </button>
              <button
                onClick={async () => {
                  const r = await api.post(`/pedidos/${comprobante.id}/confirmar-pago`, { aprueba: true });
                  setAviso(r.mensaje);
                  setComprobante(null);
                  cargar();
                }}
                className="flex-1 py-3 bg-green-700 text-white rounded-sm text-sm font-black hover:bg-green-800"
              >
                SÍ, ME LLEGÓ
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// LADO DEL CLIENTE
// ══════════════════════════════════════════════════════════════

export const MisPedidos = () => {
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [pagando, setPagando] = useState(null);

  const cargar = useCallback(() => {
    api
      .get('/pedidos/mios')
      .then((d) => setPedidos(d.pedidos))
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (cargando) return <Cargando texto="Buscando tus pedidos..." />;
  if (error) return <ErrorCarga mensaje={error} />;

  if (pedidos.length === 0) {
    return (
      <SinDatos
        titulo="Todavía no hiciste ningún pedido"
        texto="Elegí una prenda del catálogo, personalizala a tu gusto y hacé tu primer pedido."
      />
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-3">
      {pedidos.map((p) => (
        <div key={p.id} className="bg-white border border-stone-200 rounded-sm p-5">
          <div className="flex flex-wrap gap-4 justify-between items-start">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className="font-mono text-xs font-bold text-stone-500">N° {p.numero}</span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-sm ${ESTADO[p.estado].clase}`}>
                  {ESTADO[p.estado].label}
                </span>
                <EtiquetaPago estado={p.estadoPago} />
              </div>

              <div className="font-black text-stone-900">{p.taller.nombre}</div>
              <div className="text-xs text-stone-500 mb-2">
                Pedido el {fechaCorta(p.creadoEn)}
                {p.taller.telefono && ` · el taller atiende al ${p.taller.telefono}`}
              </div>

              <div className="space-y-1.5">
                {p.items.map((i) => (
                  <div key={i.id} className="flex items-center gap-2.5 text-sm">
                    {i.estampadoUrl ? (
                      <img
                        src={i.estampadoUrl}
                        alt=""
                        className="w-9 h-9 object-contain bg-stone-100 rounded-sm shrink-0"
                      />
                    ) : (
                      <div
                        className="w-9 h-9 rounded-sm shrink-0 border border-stone-200"
                        style={{ backgroundColor: i.colorHex ?? '#e7e5e4' }}
                      />
                    )}
                    <span className="font-semibold">
                      {i.cantidad} × {i.producto.nombre}
                    </span>
                    <span className="text-stone-500 text-xs">
                      {[i.color, i.talla && `talla ${i.talla}`].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-right shrink-0 flex flex-col items-end gap-2">
              <div className="text-xl font-black tabular-nums">{bs(p.total)}</div>

              {['PENDIENTE', 'RECHAZADO'].includes(p.estadoPago) && p.estado !== 'CANCELADO' && (
                <button
                  onClick={() => setPagando(p.id)}
                  className="flex items-center gap-1.5 bg-orange-500 text-stone-950 px-3 py-2 text-xs font-black rounded-sm hover:bg-orange-400"
                >
                  <QrCode size={13} /> PAGAR
                </button>
              )}

              {p.estadoPago === 'COMPROBANTE_SUBIDO' && (
                <div className="flex items-center gap-1 text-[11px] text-blue-700">
                  <Clock size={11} /> Revisando tu pago
                </div>
              )}

              {p.estado === 'NUEVO' && p.estadoPago === 'CONFIRMADO' && (
                <div className="flex items-center gap-1 text-[11px] text-stone-500">
                  <Clock size={11} /> Esperando al taller
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      <ModalPago
        pedidoId={pagando}
        open={!!pagando}
        onClose={() => setPagando(null)}
        onPagado={cargar}
      />
    </div>
  );
};

const Mini = ({ titulo, valor, color = 'text-stone-900' }) => (
  <div className="bg-white border border-stone-200 p-4 rounded-sm">
    <div className="text-[11px] tracking-[0.15em] uppercase text-stone-500 mb-1">{titulo}</div>
    <div className={`text-2xl font-black ${color}`}>{valor}</div>
  </div>
);
