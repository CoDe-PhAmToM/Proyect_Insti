// ============================================================
// RED DE SEGURIDAD PARA ERRORES DE PANTALLA
//
// Sin esto, un error en UNA vista deja TODA la app en blanco y sin
// forma de salir: hay que recargar. Eso ya pasó de verdad con el
// reporte de estado de resultados.
//
// En un piloto con microempresarios reales es peor de lo que
// parece: la persona no sabe que es un error del sistema, cree que
// hizo algo mal, y deja de usarlo. Una pantalla que dice "esto
// falló, volvé al panel" conserva la confianza; una en blanco la
// destruye.
//
// Tiene que ser componente de clase: React solo permite atrapar
// errores de render con componentClass y componentDidCatch.
// ============================================================

import React from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { reportarError } from '../lib/reportarError';

export class LimiteError extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Queda en la consola para que el equipo lo pueda diagnosticar.
    console.error('[pantalla caída]', this.props.nombre ?? '', error, info?.componentStack);
    reportarError(error, { ruta: this.props.nombre, tipo: 'pantalla' });
  }

  // Al cambiar de pantalla se limpia el error: si no, quedaría
  // trabado en el mensaje aunque la persona navegue a otro lado.
  componentDidUpdate(prevProps) {
    if (prevProps.clave !== this.props.clave && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="p-8">
        <div className="max-w-lg mx-auto bg-white border-2 border-amber-300 rounded-sm p-6 text-center">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={22} className="text-amber-700" />
          </div>

          <h2 className="font-black text-lg text-stone-900 mb-2">
            Esta pantalla no se pudo mostrar
          </h2>
          <p className="text-sm text-stone-600 leading-relaxed mb-5">
            No perdiste nada: tus datos están guardados. Probá con otra pantalla del menú, o volvé a
            cargar la página.
          </p>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => this.setState({ error: null })}
              className="px-4 py-2.5 border-2 border-stone-200 rounded-sm text-sm font-bold text-stone-600 hover:bg-stone-50"
            >
              Volver a intentar
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-stone-900 text-white rounded-sm text-sm font-black hover:bg-stone-800"
            >
              <RotateCw size={14} /> RECARGAR
            </button>
          </div>

          <details className="mt-5 text-left">
            <summary className="cursor-pointer text-xs text-stone-400 hover:text-stone-600">
              Detalle técnico (para el equipo)
            </summary>
            <pre className="mt-2 text-[11px] text-stone-500 bg-stone-50 border border-stone-200 rounded-sm p-3 overflow-x-auto whitespace-pre-wrap">
              {String(this.state.error?.message ?? this.state.error)}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}
