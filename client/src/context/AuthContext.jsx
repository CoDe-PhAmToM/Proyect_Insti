// ============================================================
// CONTEXT: Sesion
//
// Al abrir la app intenta revivir la sesion con la cookie de
// refresco. Si el usuario ya habia entrado, no le vuelve a pedir
// la clave — importa en un contexto donde escribir una contrasena
// larga en el celular es una friccion real.
// ============================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, setAccessToken, onSesionExpirada } from '../lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  // Reviviendo la sesion al arrancar
  useEffect(() => {
    let vivo = true;

    (async () => {
      const renovado = await api.renovarSesion();
      if (!vivo) return;
      if (renovado?.usuario) setUsuario(renovado.usuario);
      setCargando(false);
    })();

    onSesionExpirada(() => {
      setAccessToken(null);
      setUsuario(null);
    });

    return () => {
      vivo = false;
    };
  }, []);

  const entrar = useCallback(async (email, password) => {
    const d = await api.login(email, password);
    setAccessToken(d.accessToken);
    setUsuario(d.usuario);
    return d.usuario;
  }, []);

  const registrarse = useCallback(async (datos) => {
    const d = await api.registro(datos);
    setAccessToken(d.accessToken);
    setUsuario(d.usuario);
    return d.usuario;
  }, []);

  const salir = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setAccessToken(null);
      setUsuario(null);
    }
  }, []);

  const esProductor = usuario?.rol === 'PRODUCTOR';
  const esAyudante = usuario?.rol === 'AYUDANTE';
  const esCliente = usuario?.rol === 'CLIENTE';
  const esAdmin = usuario?.rol === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        usuario,
        cargando,
        entrar,
        registrarse,
        salir,
        esProductor,
        esAyudante,
        esCliente,
        esAdmin,
        // El ayudante registra movimientos pero no ve plata fina
        puedeVerCostos: esProductor || esAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};
