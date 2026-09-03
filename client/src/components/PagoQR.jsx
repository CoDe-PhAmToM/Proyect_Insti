// ============================================================
// PAGO CON QR SIMPLE
//
// Bolivia tiene desde 2023 un estándar de QR interoperable
// obligatorio: el QR Simple del BCB. Todas las apps bancarias
// bolivianas lo leen. Es la infraestructura que la población ya
// usa, gratis y sin convenio.
//
// Se descartó una pasarela de pago por una razón de fondo: exigen
// NIT y cuenta empresarial, y la población del estudio es informal
// por definición. Pedirle NIT excluiría justo a quien la tesis
// quiere ayudar. Además, un 4 % de comisión sobre una polera de
// Bs. 65 con margen de Bs. 15 se come el 17 % de la ganancia.
//
// El flujo: el taller sube su QR una vez, el cliente paga desde su
// banco y sube la captura, el taller confirma que le llegó.
// ============================================================

import React, { useState, useEffect } from 'react';
import { Loader2, Upload, Check, QrCode, AlertTriangle, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { reducirImagen } from '../lib/imagen';
import { Modal, FormField, inputClass } from './Modal';
import { bs } from 'shared/formato';

const ESTADO_PAGO = {
  PENDIENTE:          { label: 'Sin pagar',            clase: 'bg-stone-100 text-stone-700' },
  COMPROBANTE_SUBIDO: { label: 'Comprobante enviado',  clase: 'bg-blue-100 text-blue-800' },
  CONFIRMADO:         { label: 'Pagado',               clase: 'bg-green-100 text-green-800' },
  RECHAZADO:          { label: 'Pago rechazado',       clase: 'bg-red-100 text-red-800' },
};

export const EtiquetaPago = ({ estado }) => {
  const e = ESTADO_PAGO[estado] ?? ESTADO_PAGO.PENDIENTE;
  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-sm ${e.clase}`}>{e.label}</span>
  );
};

// ── Modal del cliente: pagar ─────────────────────────────────

export const ModalPago = ({ pedidoId, open, onClose, onPagado }) => {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [comprobante, setComprobante] = useState(null);
  const [nota, setNota] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    if (!open || !pedidoId) return;
    setDatos(null);
    setListo(false);
    setComprobante(null);
    setError(null);
    api.get(`/pedidos/${pedidoId}/pago`).then(setDatos).catch((e) => setError(e.message));
  }, [open, pedidoId]);

  const elegirArchivo = async (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setSubiendo(true);
    setError(null);
    try {
      const r = await reducirImagen(archivo);
      setComprobante(r.dataUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubiendo(false);
    }
  };

  const enviar = async () => {
    setEnviando(true);
    setError(null);
    try {
      await api.post(`/pedidos/${pedidoId}/comprobante`, { comprobante, nota: nota || null });
      setListo(true);
      onPagado?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  };

  if (listo) {
    return (
      <Modal open={open} onClose={onClose} title="Comprobante enviado" subtitulo="Gracias">
        <div className="space-y-4 text-center py-2">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Check size={26} className="text-green-700" />
          </div>
          <p className="text-sm text-stone-600 leading-relaxed">
            El taller va a revisar el comprobante y te confirma. Si tiene alguna duda, te escribe.
          </p>
          <button
            onClick={onClose}
            className="w-full py-3 bg-stone-900 text-white rounded-sm text-sm font-black hover:bg-stone-800"
          >
            LISTO
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pagar tu pedido"
      subtitulo={datos ? `N° ${datos.numero}` : ''}
    >
      {!datos && !error && <div className="py-8 text-center text-sm text-stone-500">Cargando...</div>}

      {error && (
        <div className="bg-red-50 border-2 border-red-200 text-red-800 text-sm rounded-sm p-3 mb-4">
          {error}
        </div>
      )}

      {datos && (
        <div className="space-y-5">
          <div className="bg-stone-950 text-white p-5 rounded-sm text-center">
            <div className="text-[11px] tracking-[0.2em] uppercase text-stone-400 mb-1">
              Total a pagar
            </div>
            <div className="text-3xl font-black text-orange-400">{bs(datos.total)}</div>
          </div>

          {!datos.hayQr ? (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-sm p-4 flex items-start gap-2.5 text-sm text-amber-900">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <div>
                {datos.aviso}
                {datos.taller.telefono && (
                  <div className="mt-1 font-bold">WhatsApp: {datos.taller.telefono}</div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="bg-white border-2 border-stone-200 rounded-sm p-5 text-center">
                <div className="text-[11px] uppercase tracking-wider text-stone-500 mb-3">
                  Escaneá con tu app del banco
                </div>
                <img
                  src={datos.taller.qrUrl}
                  alt="QR para pagar"
                  className="w-52 h-52 object-contain mx-auto"
                />
                <div className="mt-3 text-sm">
                  <div className="font-bold text-stone-900">
                    {datos.taller.qrTitular ?? datos.taller.nombre}
                  </div>
                  {datos.taller.qrBanco && (
                    <div className="text-stone-500 text-xs">{datos.taller.qrBanco}</div>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-sm p-3 text-xs text-blue-900">
                Escribí vos el monto exacto en tu app: <strong>{bs(datos.total)}</strong>. Después
                sacale una captura al comprobante y subila acá abajo.
              </div>
            </>
          )}

          {/* Comprobante */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-2">
              Captura del comprobante
            </div>

            {!comprobante ? (
              <label className="block w-full border-2 border-dashed border-stone-300 rounded-sm py-7 flex flex-col items-center gap-2 text-stone-500 hover:border-orange-400 hover:text-orange-600 cursor-pointer">
                {subiendo ? (
                  <Loader2 size={22} className="animate-spin" />
                ) : (
                  <Upload size={22} />
                )}
                <span className="text-sm font-bold">
                  {subiendo ? 'Preparando...' : 'Subí la captura'}
                </span>
                <input type="file" accept="image/*" onChange={elegirArchivo} className="hidden" />
              </label>
            ) : (
              <div className="border border-stone-200 rounded-sm p-3 flex items-center gap-3">
                <img src={comprobante} alt="" className="w-16 h-16 object-contain bg-stone-100 rounded-sm" />
                <div className="flex-1 text-xs font-bold text-stone-800">Comprobante listo</div>
                <button
                  onClick={() => setComprobante(null)}
                  className="p-1.5 text-stone-400 hover:text-red-600"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          </div>

          <FormField label="¿Querés aclarar algo? (opcional)">
            <input
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Pagué desde la cuenta de mi hermana"
              className={inputClass}
            />
          </FormField>

          <button
            onClick={enviar}
            disabled={!comprobante || enviando}
            className="w-full py-3 bg-orange-500 text-stone-950 rounded-sm text-sm font-black hover:bg-orange-400 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {enviando && <Loader2 size={15} className="animate-spin" />}
            ENVIAR COMPROBANTE
          </button>
        </div>
      )}
    </Modal>
  );
};

// ── Modal del taller: cargar su QR ───────────────────────────

export const ModalMiQR = ({ open, onClose, onGuardado }) => {
  const [datos, setDatos] = useState(null);
  const [qr, setQr] = useState(null);
  const [titular, setTitular] = useState('');
  const [banco, setBanco] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    api.get('/taller').then((d) => {
      setDatos(d);
      setQr(d.qrUrl);
      setTitular(d.qrTitular ?? '');
      setBanco(d.qrBanco ?? '');
    });
  }, [open]);

  const elegir = async (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setSubiendo(true);
    setError(null);
    try {
      const r = await reducirImagen(archivo);
      setQr(r.dataUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubiendo(false);
    }
  };

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      await api.put('/taller/qr', { qr, titular, banco });
      onGuardado?.();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Tu QR para cobrar" subtitulo="Pagos de la tienda">
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-800 text-sm rounded-sm p-3">
            {error}
          </div>
        )}

        <div className="bg-stone-50 border border-stone-200 rounded-sm p-3 text-xs text-stone-600">
          Sacá tu QR desde la app de tu banco — buscá "QR para cobrar" o "mi QR" — y subí la imagen
          acá. Tus clientes lo van a ver al cerrar el pedido y te pagan desde su propio banco.
        </div>

        {!qr ? (
          <label className="block w-full border-2 border-dashed border-stone-300 rounded-sm py-10 flex flex-col items-center gap-2 text-stone-500 hover:border-orange-400 hover:text-orange-600 cursor-pointer">
            {subiendo ? <Loader2 size={24} className="animate-spin" /> : <QrCode size={24} />}
            <span className="text-sm font-bold">{subiendo ? 'Preparando...' : 'Subí tu QR'}</span>
            <input type="file" accept="image/*" onChange={elegir} className="hidden" />
          </label>
        ) : (
          <div className="border-2 border-stone-200 rounded-sm p-4 text-center">
            <img src={qr} alt="Tu QR" className="w-44 h-44 object-contain mx-auto" />
            <button
              onClick={() => setQr(null)}
              className="mt-3 text-xs font-bold text-stone-500 hover:text-red-600"
            >
              Quitar y subir otro
            </button>
          </div>
        )}

        <FormField label="¿A nombre de quién está la cuenta?">
          <input
            value={titular}
            onChange={(e) => setTitular(e.target.value)}
            placeholder="María Mamani"
            className={inputClass}
          />
        </FormField>

        <FormField label="¿De qué banco?">
          <input
            value={banco}
            onChange={(e) => setBanco(e.target.value)}
            placeholder="Banco Unión"
            className={inputClass}
          />
        </FormField>

        <button
          onClick={guardar}
          disabled={guardando}
          className="w-full py-3 bg-stone-900 text-white rounded-sm text-sm font-black hover:bg-stone-800 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {guardando && <Loader2 size={15} className="animate-spin" />}
          GUARDAR
        </button>
      </div>
    </Modal>
  );
};
