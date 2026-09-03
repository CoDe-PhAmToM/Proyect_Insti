// ============================================================
// VISTA: Acceso
//
// Lo mas simple posible. La poblacion objetivo tiene baja
// alfabetizacion digital, asi que: campos grandes, un solo boton,
// errores en castellano llano y la opcion de ver la contrasena
// que se escribio (en un celular, escribir a ciegas es la primera
// causa de que alguien no pueda entrar).
// ============================================================

import React, { useState } from 'react';
import { Eye, EyeOff, LogIn, UserPlus, Loader2, KeyRound, Check } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const input =
  'w-full px-4 py-3 border-2 border-stone-300 rounded-sm text-base focus:outline-none focus:border-orange-500 bg-white';

export const Login = () => {
  const { entrar, registrarse } = useAuth();

  const [modo, setModo] = useState('entrar'); // entrar | crear | recuperar
  const [codigo, setCodigo] = useState('');
  const [recuperado, setRecuperado] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', nombre: '', nombreTaller: '' });
  const [verClave, setVerClave] = useState(false);
  const [error, setError] = useState(null);
  const [detalles, setDetalles] = useState({});
  const [enviando, setEnviando] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const enviar = async (e) => {
    e.preventDefault();
    setError(null);
    setDetalles({});
    setEnviando(true);
    try {
      if (modo === 'entrar') await entrar(form.email, form.password);
      else if (modo === 'recuperar') {
        await api.post('/reseteo/usar', {
          email: form.email,
          codigo,
          password: form.password,
        });
        setRecuperado(true);
        setModo('entrar');
        setForm((f) => ({ ...f, password: '' }));
        setCodigo('');
      } else await registrarse(form);
    } catch (err) {
      setError(err.message);
      setDetalles(err.detalles ?? {});
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Marca */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-sm flex items-center justify-center font-black text-stone-950 text-xl shrink-0">
            G
          </div>
          <div>
            <div className="font-black text-lg leading-tight tracking-tight text-stone-100">
              GESTIÓN FINANCIERA
            </div>
            <div className="text-[11px] text-stone-500 tracking-[0.15em] uppercase mt-0.5">
              Confección · El Alto
            </div>
          </div>
        </div>

        <form onSubmit={enviar} className="bg-white rounded-sm p-7 space-y-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-stone-900">
              {modo === 'entrar'
                ? 'Entrá a tu taller'
                : modo === 'recuperar'
                  ? 'Poner una clave nueva'
                  : 'Creá tu cuenta'}
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              {modo === 'entrar'
                ? 'Poné tu correo y tu contraseña.'
                : modo === 'recuperar'
                  ? 'Pedile el código al equipo y escribilo acá.'
                  : 'Es gratis y toma un minuto.'}
            </p>
          </div>

          {recuperado && (
            <div className="bg-green-50 border-2 border-green-300 text-green-900 text-sm rounded-sm p-3 flex items-start gap-2">
              <Check size={15} className="mt-0.5 shrink-0" />
              Listo. Ya podés entrar con tu contraseña nueva.
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-800 text-sm rounded-sm p-3">
              {error}
            </div>
          )}

          {modo === 'crear' && (
            <>
              <Campo label="¿Cómo te llamás?" error={detalles.nombre}>
                <input
                  className={input}
                  value={form.nombre}
                  onChange={set('nombre')}
                  placeholder="María Mamani"
                  autoComplete="name"
                />
              </Campo>
              <Campo label="¿Cómo se llama tu taller?" error={detalles.nombreTaller}>
                <input
                  className={input}
                  value={form.nombreTaller}
                  onChange={set('nombreTaller')}
                  placeholder="Taller Mamani"
                />
              </Campo>
            </>
          )}

          <Campo label="Correo" error={detalles.email}>
            <input
              className={input}
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="tucorreo@ejemplo.com"
              autoComplete="email"
              autoCapitalize="none"
            />
          </Campo>

          {modo === 'recuperar' && (
            <Campo label="Código que te dieron" error={detalles.codigo}>
              <input
                className={`${input} text-center text-2xl font-black tracking-[0.3em]`}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
              />
              <p className="text-xs text-stone-500 mt-1">
                Son 6 números y duran 30 minutos.
              </p>
            </Campo>
          )}

          <Campo label={modo === 'recuperar' ? 'Tu contraseña nueva' : 'Contraseña'} error={detalles.password}>
            <div className="relative">
              <input
                className={`${input} pr-12`}
                type={verClave ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                onClick={() => setVerClave((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1"
                aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {verClave ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Campo>

          <button
            type="submit"
            disabled={enviando}
            className="w-full bg-stone-900 text-white py-3.5 rounded-sm font-black text-sm tracking-wide hover:bg-stone-800 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {enviando ? (
              <>
                <Loader2 size={16} className="animate-spin" /> UN MOMENTO...
              </>
            ) : modo === 'entrar' ? (
              <>
                <LogIn size={16} /> ENTRAR
              </>
            ) : modo === 'recuperar' ? (
              <>
                <KeyRound size={16} /> GUARDAR CONTRASEÑA
              </>
            ) : (
              <>
                <UserPlus size={16} /> CREAR MI CUENTA
              </>
            )}
          </button>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                setModo((m) => (m === 'entrar' ? 'crear' : 'entrar'));
                setError(null);
                setDetalles({});
                setRecuperado(false);
              }}
              className="w-full text-sm text-stone-600 hover:text-stone-900 underline"
            >
              {modo === 'entrar' ? '¿No tenés cuenta? Creá una' : 'Ya tengo cuenta, quiero entrar'}
            </button>

            {modo !== 'recuperar' && (
              <button
                type="button"
                onClick={() => {
                  setModo('recuperar');
                  setError(null);
                  setDetalles({});
                  setRecuperado(false);
                }}
                className="w-full text-xs text-stone-500 hover:text-stone-800 underline"
              >
                Olvidé mi contraseña
              </button>
            )}
          </div>
        </form>

        <p className="text-[11px] text-stone-600 text-center mt-5 leading-relaxed">
          Plataforma de Gestión Financiera para microempresas de confección
          <br />
          Distrito 6 · El Alto
        </p>
      </div>
    </div>
  );
};

const Campo = ({ label, error, children }) => (
  <div>
    <label className="block text-sm font-bold text-stone-700 mb-1.5">{label}</label>
    {children}
    {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
  </div>
);
