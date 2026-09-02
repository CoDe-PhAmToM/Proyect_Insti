// ============================================================
// MANEJO CENTRAL DE ERRORES
//
// Los errores previstos (ErrorApp) salen con su mensaje, escrito
// para que lo lea el microempresario. Los imprevistos se registran
// completos en el servidor y afuera sale un mensaje generico: un
// stack trace en pantalla es una filtracion, no una ayuda.
// ============================================================

import { ErrorApp } from '../lib/errores.js';
import { env } from '../lib/env.js';

export const noEncontrado = (req, _res, next) => {
  next(new ErrorApp(404, `No existe la ruta ${req.method} ${req.originalUrl}`));
};

// Express reconoce el manejador de errores por los cuatro parametros.
// eslint-disable-next-line no-unused-vars
export const manejadorErrores = (err, req, res, _next) => {
  if (err instanceof ErrorApp) {
    return res.status(err.estado).json({
      error: err.message,
      ...(err.detalles ? { detalles: err.detalles } : {}),
    });
  }

  // Errores conocidos de Prisma traducidos a lenguaje humano
  if (err?.code === 'P2002') {
    const campo = err.meta?.target?.[0] ?? 'ese dato';
    return res.status(409).json({ error: `Ya existe un registro con ${campo}` });
  }
  if (err?.code === 'P2025') {
    return res.status(404).json({ error: 'No se encontro lo que buscabas' });
  }
  if (err?.code === 'P2003') {
    return res.status(409).json({
      error: 'No se puede borrar: hay otros registros que dependen de este',
    });
  }

  // JSON mal formado en el cuerpo de la peticion
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la peticion no es JSON valido' });
  }

  console.error('[error no previsto]', {
    ruta: `${req.method} ${req.originalUrl}`,
    usuario: req.usuario?.usuarioId ?? null,
    mensaje: err?.message,
    stack: err?.stack,
  });

  res.status(500).json({
    error: 'Algo fallo de nuestro lado. Volve a intentar en un momento.',
    ...(env.esProduccion ? {} : { detalleTecnico: err?.message }),
  });
};
