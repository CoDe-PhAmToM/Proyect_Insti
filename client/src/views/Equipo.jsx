// ============================================================
// VISTA: Equipo del taller
//
// El rol AYUDANTE existía, funcionaba y estaba probado — pero no
// había forma de dar de alta a alguien desde la interfaz. Había que
// insertar la fila a mano en la base de datos.
//
// Eso no era un detalle: el documento nombra como problema la
// "dependencia absoluta de la memoria del dueño, imposibilitando
// delegar". Si en el piloto ningún taller puede usar el rol, esa
// parte de la hipótesis se queda sin evidencia.
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { UserPlus, KeyRound, Trash2, Loader2, Copy, Check, X, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { Modal, FormField, inputClass } from '../components/Modal';
import { Cargando, ErrorCarga } from '../components/Layout';
import { fechaCorta } from 'shared/formato';

export const Equipo = () => {
  const [miembros, setMiembros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(false);
  const [clave, setClave] = useState(null);
  const [aQuitar, setAQuitar] = useState(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const d = await api.get('/miembros');
      setMiembros(d.miembros);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const nuevaClave = async (id) => {
    try {
      setClave(await api.post(`/miembros/${id}/nueva-clave`));
    } catch (e) {
      setError(e.message);
    }
  };

  if (cargando) return <Cargando texto="Cargando tu equipo..." />;
  if (error) return <ErrorCarga mensaje={error} onReintentar={cargar} />;

  return (
    <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">
      <div className="bg-white border border-stone-200 rounded-sm overflow-hidden">
        <div className="p-5 border-b border-stone-200 flex flex-wrap gap-3 justify-between items-center">
          <div>
            <div className="text-[11px] tracking-[0.2em] uppercase text-stone-500 mb-1">Taller</div>
            <h2 className="text-xl font-black tracking-tight">Quiénes trabajan acá</h2>
          </div>
          <button
            onClick={() => setModal(true)}
            className="flex items-center gap-1.5 bg-orange-500 text-stone-950 px-4 py-2.5 text-xs font-black rounded-sm hover:bg-orange-400"
          >
            <UserPlus size={14} /> AGREGAR AYUDANTE
          </button>
        </div>

        <div className="divide-y divide-stone-100">
          {miembros.map((m) => (
            <div key={m.id} className="p-5 flex flex-wrap gap-4 justify-between items-center">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-stone-900">{m.nombre}</span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-sm ${
                      m.esDueno
                        ? 'bg-stone-900 text-white'
                        : m.rolEnTaller === 'AYUDANTE'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-stone-100 text-stone-700'
                    }`}
                  >
                    {m.esDueno ? 'DUEÑO' : m.rolEnTaller}
                  </span>
                  {!m.activo && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-sm bg-red-100 text-red-800">
                      DESACTIVADO
                    </span>
                  )}
                </div>
                <div className="text-xs text-stone-500 mt-0.5">{m.email}</div>
                <div className="text-[11px] text-stone-400 mt-0.5">
                  {m.ultimoAcceso ? `Última vez: ${fechaCorta(m.ultimoAcceso)}` : 'Todavía no entró'}
                </div>
              </div>

              {!m.esDueno && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => nuevaClave(m.id)}
                    title="Darle una contraseña nueva"
                    className="flex items-center gap-1.5 border border-stone-300 px-3 py-2 text-xs font-bold rounded-sm hover:bg-stone-100"
                  >
                    <KeyRound size={13} /> NUEVA CLAVE
                  </button>
                  <button
                    onClick={() => setAQuitar(m)}
                    title="Sacar del taller"
                    className="p-2 text-stone-300 hover:text-red-600 hover:bg-red-50 rounded-sm"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-sm p-4 flex items-start gap-2.5 text-sm text-blue-900">
        <ShieldCheck size={16} className="mt-0.5 shrink-0" />
        <div>
          <strong>Qué puede hacer un ayudante:</strong> anotar ventas y gastos, cargar materiales y
          avanzar las órdenes de producción. <strong>Qué no ve:</strong> los costos, los márgenes,
          los reportes ni las recomendaciones. Podés delegar el registro sin abrir toda la caja.
        </div>
      </div>

      <ModalNuevoMiembro
        open={modal}
        onClose={() => setModal(false)}
        onCreado={(r) => {
          setModal(false);
          if (r.claveInicial) setClave(r);
          cargar();
        }}
      />

      {/* La clave se muestra UNA vez: después solo existe hasheada */}
      <Modal open={!!clave} onClose={() => setClave(null)} title="Anotá esta contraseña">
        <div className="space-y-4">
          <div className="bg-stone-950 text-white p-6 rounded-sm text-center">
            <div className="text-[11px] tracking-[0.2em] uppercase text-stone-400 mb-2">
              Contraseña
            </div>
            <div className="text-2xl font-black text-orange-400 tracking-wide break-all">
              {clave?.claveInicial}
            </div>
            <button
              onClick={() => navigator.clipboard?.writeText(clave.claveInicial)}
              className="mt-3 flex items-center gap-1.5 mx-auto text-[11px] font-bold text-stone-400 hover:text-white"
            >
              <Copy size={12} /> COPIAR
            </button>
          </div>
          <p className="text-sm text-stone-600">{clave?.mensaje}</p>
          <button
            onClick={() => setClave(null)}
            className="w-full py-3 bg-stone-900 text-white rounded-sm text-sm font-black hover:bg-stone-800"
          >
            YA LA ANOTÉ
          </button>
        </div>
      </Modal>

      <Modal open={!!aQuitar} onClose={() => setAQuitar(null)} title="¿Sacar del taller?">
        <div className="space-y-4">
          <p className="text-sm text-stone-600">
            <strong>{aQuitar?.nombre}</strong> ya no va a poder entrar. Los movimientos que anotó se
            conservan: no se borra nada de lo que ya registró.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setAQuitar(null)}
              className="flex-1 py-2.5 border-2 border-stone-200 rounded-sm text-sm font-bold"
            >
              No
            </button>
            <button
              onClick={async () => {
                await api.delete(`/miembros/${aQuitar.id}`);
                setAQuitar(null);
                cargar();
              }}
              className="flex-1 py-2.5 bg-red-600 text-white rounded-sm text-sm font-black hover:bg-red-700"
            >
              SÍ, SACAR
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const ModalNuevoMiembro = ({ open, onClose, onCreado }) => {
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '' });
  const [error, setError] = useState(null);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ nombre: '', email: '', telefono: '' });
      setError(null);
      setErrores({});
    }
  }, [open]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const crear = async () => {
    setGuardando(true);
    setError(null);
    setErrores({});
    try {
      onCreado(await api.post('/miembros', { ...form, rolEnTaller: 'AYUDANTE' }));
    } catch (e) {
      setError(e.message);
      setErrores(e.detalles ?? {});
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Agregar un ayudante" subtitulo="Tu equipo">
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-800 text-sm rounded-sm p-3">
            {error}
          </div>
        )}

        <div className="bg-stone-50 border border-stone-200 rounded-sm p-3 text-xs text-stone-600">
          Se le crea la cuenta acá mismo y el sistema te da una contraseña para dictarle. No hace
          falta que tenga correo activo: alcanza con inventar uno que se acuerde.
        </div>

        <FormField label="¿Cómo se llama?">
          <input value={form.nombre} onChange={set('nombre')} placeholder="Rosa Quispe" className={inputClass} />
          {errores.nombre && <p className="text-xs text-red-600 mt-1">{errores.nombre}</p>}
        </FormField>

        <FormField label="Correo con el que va a entrar">
          <input
            value={form.email}
            onChange={set('email')}
            placeholder="rosa@taller.bo"
            className={inputClass}
            autoCapitalize="none"
          />
          {errores.email && <p className="text-xs text-red-600 mt-1">{errores.email}</p>}
        </FormField>

        <FormField label="Teléfono (opcional)">
          <input value={form.telefono} onChange={set('telefono')} placeholder="70000000" className={inputClass} />
        </FormField>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border-2 border-stone-200 rounded-sm text-sm font-bold text-stone-600">
            Cancelar
          </button>
          <button
            onClick={crear}
            disabled={guardando || !form.nombre || !form.email}
            className="flex-1 py-3 bg-stone-900 text-white rounded-sm text-sm font-black hover:bg-stone-800 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {guardando && <Loader2 size={15} className="animate-spin" />}
            CREAR CUENTA
          </button>
        </div>
      </div>
    </Modal>
  );
};
