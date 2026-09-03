// ============================================================
// COMPONENTE: Modal reutilizable
// ============================================================

import React from 'react';
import { X } from 'lucide-react';

export const Modal = ({ open, onClose, title, subtitulo, children, wide }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Contenido */}
      <div className={`relative bg-white rounded-sm shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] flex flex-col`}>
        <div className="flex items-start justify-between p-6 border-b border-stone-100 shrink-0">
          <div>
            {subtitulo && (
              <div className="text-[11px] tracking-[0.25em] uppercase text-stone-500 mb-1">{subtitulo}</div>
            )}
            <h3 className="text-xl font-black tracking-tight text-stone-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-stone-100 rounded-sm text-stone-400 hover:text-stone-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

// ── Elementos de formulario compartidos ─────────────────────
export const FormField = ({ label, children }) => (
  <div>
    <label className="block text-[11px] font-bold tracking-[0.15em] uppercase text-stone-500 mb-1.5">
      {label}
    </label>
    {children}
  </div>
);

export const inputClass =
  "w-full px-3 py-2 border border-stone-300 rounded-sm text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500";
