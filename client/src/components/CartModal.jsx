// ============================================================
// COMPONENTE: Carrito de compras
// Lista los diseños agregados, permite quitarlos y confirmar el pedido
// ============================================================

import React, { useState } from 'react';
import { Trash2, ShoppingBag, CheckCircle2 } from 'lucide-react';
import { Modal } from './Modal';
import { useCart } from '../context/CartContext';

export const CartModal = ({ open, onClose }) => {
  const { items, quitarItem, vaciarCarrito, total } = useCart();
  const [confirmado, setConfirmado] = useState(false);

  const cerrar = () => {
    setConfirmado(false);
    onClose();
  };

  const confirmarPedido = () => {
    setConfirmado(true);
  };

  const seguirComprando = () => {
    vaciarCarrito();
    setConfirmado(false);
    onClose();
  };

  // Estado: pedido confirmado
  if (confirmado) {
    return (
      <Modal open={open} onClose={seguirComprando} title="Pedido confirmado" subtitulo="¡Listo!">
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h3 className="text-lg font-black text-stone-900 mb-2">Tu pedido fue enviado al taller</h3>
          <p className="text-sm text-stone-600 mb-6">
            El productor va a revisar tu diseño y se va a contactar para coordinar el pago y la entrega.
          </p>
          <button
            onClick={seguirComprando}
            className="w-full bg-stone-900 text-white py-2.5 rounded-sm text-sm font-black hover:bg-stone-800"
          >
            Seguir comprando
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={cerrar} title="Tu carrito" subtitulo={`${items.length} diseño${items.length !== 1 ? 's' : ''}`}>
      {items.length === 0 ? (
        <div className="text-center py-8">
          <ShoppingBag size={32} className="mx-auto mb-3 text-stone-300" />
          <p className="text-sm text-stone-500">Todavía no agregaste ningún diseño.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-3 bg-stone-50 border border-stone-200 rounded-sm p-3">
                {/* Miniatura: color de tela + estampado si tiene */}
                <div
                  className="w-12 h-12 rounded-sm border border-stone-300 shrink-0 flex items-center justify-center relative overflow-hidden"
                  style={{ backgroundColor: item.colorHex }}
                >
                  {item.estampado && (
                    <img src={item.estampado} alt="" className="w-6 h-6 object-cover opacity-90" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">{item.producto}</div>
                  <div className="text-xs text-stone-500">
                    {item.color} · Talla {item.talla} · {item.tieneEstampado ? 'Con estampado' : 'Sin estampado'}
                  </div>
                </div>
                <div className="text-sm font-black shrink-0">Bs. {item.precio}</div>
                <button
                  onClick={() => quitarItem(item.id)}
                  className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-sm shrink-0"
                  title="Quitar"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="border-t border-stone-200 pt-4 flex justify-between items-end">
            <span className="text-xs text-stone-500 uppercase tracking-wider">Total del pedido</span>
            <span className="text-2xl font-black text-stone-900">Bs. {total}</span>
          </div>

          <button
            onClick={confirmarPedido}
            className="w-full bg-orange-500 text-stone-950 py-3 rounded-sm text-sm font-black hover:bg-orange-400 tracking-wide"
          >
            CONFIRMAR PEDIDO →
          </button>
        </div>
      )}
    </Modal>
  );
};
