// ============================================================
// COMPONENTE: Carrito y confirmación de pedido
//
// Al confirmar, el pedido viaja al servidor y le llega al taller.
// No hay pasarela de pago: se coordina por WhatsApp, que es como
// funciona el sector. Eso evita todo el problema regulatorio y de
// comisiones, y no le agrega una fricción al comprador que hoy
// simplemente no existe.
// ============================================================

import React, { useState } from 'react';
import { Trash2, Check, Loader2, ShoppingBag } from 'lucide-react';
import { Modal, FormField, inputClass } from './Modal';
import { useCart } from '../context/CartContext';
import { bs } from 'shared/formato';

export const CartModal = ({ open, onClose }) => {
  const { items, total, enviando, quitarItem, vaciarCarrito, confirmarPedido } = useCart();

  const [paso, setPaso] = useState('carrito'); // carrito | datos | listo
  const [datos, setDatos] = useState({ direccionEntrega: '', telefonoContacto: '', notas: '' });
  const [error, setError] = useState(null);
  const [resultado, setResultado] = useState(null);

  const cerrar = () => {
    setPaso('carrito');
    setError(null);
    setResultado(null);
    onClose();
  };

  const confirmar = async () => {
    setError(null);
    try {
      setResultado(await confirmarPedido(datos));
      setPaso('listo');
    } catch (e) {
      setError(e.message);
    }
  };

  // ── Pedido confirmado ──────────────────────────────────────
  if (paso === 'listo' && resultado) {
    return (
      <Modal open={open} onClose={cerrar} title="¡Pedido enviado!" subtitulo={`N° ${resultado.numero}`}>
        <div className="space-y-4 text-center py-2">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Check size={26} className="text-green-700" />
          </div>
          <p className="text-sm text-stone-600 leading-relaxed">{resultado.mensaje}</p>
          <div className="bg-stone-50 border border-stone-200 rounded-sm p-4">
            <div className="text-[11px] uppercase tracking-wider text-stone-500 mb-1">Total</div>
            <div className="text-2xl font-black">{bs(resultado.total)}</div>
          </div>
          <button
            onClick={cerrar}
            className="w-full py-3 bg-stone-900 text-white rounded-sm text-sm font-black hover:bg-stone-800"
          >
            LISTO
          </button>
        </div>
      </Modal>
    );
  }

  // ── Datos de entrega ───────────────────────────────────────
  if (paso === 'datos') {
    return (
      <Modal open={open} onClose={cerrar} title="¿Dónde te lo entregamos?" subtitulo="Último paso">
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-800 text-sm rounded-sm p-3">
              {error}
            </div>
          )}

          <FormField label="Tu teléfono (para coordinar por WhatsApp)">
            <input
              value={datos.telefonoContacto}
              onChange={(e) => setDatos((d) => ({ ...d, telefonoContacto: e.target.value }))}
              placeholder="70000000"
              className={inputClass}
            />
          </FormField>

          <FormField label="Dirección o punto de encuentro">
            <input
              value={datos.direccionEntrega}
              onChange={(e) => setDatos((d) => ({ ...d, direccionEntrega: e.target.value }))}
              placeholder="Av. Juan Pablo II, frente a la feria"
              className={inputClass}
            />
          </FormField>

          <FormField label="¿Algo que el taller deba saber? (opcional)">
            <input
              value={datos.notas}
              onChange={(e) => setDatos((d) => ({ ...d, notas: e.target.value }))}
              placeholder="Lo necesito para el 20"
              className={inputClass}
            />
          </FormField>

          <div className="bg-blue-50 border border-blue-200 rounded-sm p-3 text-xs text-blue-900">
            No se paga por acá. El taller te va a contactar para coordinar la entrega y la forma de
            pago.
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setPaso('carrito')}
              className="flex-1 py-3 border-2 border-stone-200 rounded-sm text-sm font-bold text-stone-600"
            >
              Volver
            </button>
            <button
              onClick={confirmar}
              disabled={enviando}
              className="flex-1 py-3 bg-orange-500 text-stone-950 rounded-sm text-sm font-black hover:bg-orange-400 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {enviando && <Loader2 size={15} className="animate-spin" />}
              CONFIRMAR PEDIDO
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // ── Carrito ────────────────────────────────────────────────
  return (
    <Modal
      open={open}
      onClose={cerrar}
      title="Tu carrito"
      subtitulo={`${items.length} prenda${items.length !== 1 ? 's' : ''}`}
    >
      {items.length === 0 ? (
        <div className="py-8 text-center">
          <ShoppingBag size={28} className="text-stone-300 mx-auto mb-3" />
          <p className="text-sm text-stone-500">Todavía no agregaste nada.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {items.map((i) => (
              <div
                key={i.idLocal}
                className="flex items-center gap-3 border border-stone-200 rounded-sm p-3"
              >
                {i.estampado ? (
                  <img
                    src={i.estampado}
                    alt=""
                    className="w-11 h-11 object-contain bg-stone-100 rounded-sm shrink-0"
                  />
                ) : (
                  <div
                    className="w-11 h-11 rounded-sm shrink-0 border border-stone-200"
                    style={{ backgroundColor: i.colorHex ?? '#e7e5e4' }}
                  />
                )}

                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-stone-900 truncate">{i.nombre}</div>
                  <div className="text-[11px] text-stone-500">
                    {[i.color, i.talla && `talla ${i.talla}`, i.estampado && 'con estampado']
                      .filter(Boolean)
                      .join(' · ') || 'Sin personalizar'}
                  </div>
                </div>

                <div className="text-sm font-black tabular-nums shrink-0">{bs(i.precio)}</div>
                <button
                  onClick={() => quitarItem(i.idLocal)}
                  className="p-1 text-stone-300 hover:text-red-600 shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-baseline pt-3 border-t-2 border-stone-200">
            <span className="font-bold">Total</span>
            <span className="text-2xl font-black">{bs(total)}</span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={vaciarCarrito}
              className="px-4 py-3 border-2 border-stone-200 rounded-sm text-sm font-bold text-stone-600"
            >
              Vaciar
            </button>
            <button
              onClick={() => setPaso('datos')}
              className="flex-1 py-3 bg-stone-900 text-white rounded-sm text-sm font-black hover:bg-stone-800"
            >
              HACER EL PEDIDO
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
