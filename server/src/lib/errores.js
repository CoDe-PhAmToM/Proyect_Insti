// ============================================================
// ERRORES DE APLICACION
// Un error con codigo HTTP y un mensaje pensado para mostrarse
// al usuario. Los errores inesperados nunca exponen su detalle
// hacia afuera: se registran en el servidor y afuera sale un
// mensaje generico.
// ============================================================

export class ErrorApp extends Error {
  constructor(estado, mensaje, detalles = null) {
    super(mensaje);
    this.estado = estado;
    this.detalles = detalles;
    this.esOperacional = true;
  }
}

export const errores = {
  // 400 - el pedido esta mal armado
  datosInvalidos: (mensaje = 'Los datos enviados no son validos', detalles) =>
    new ErrorApp(400, mensaje, detalles),

  // 401 - no sabemos quien sos
  noAutenticado: (mensaje = 'Necesitas iniciar sesion') => new ErrorApp(401, mensaje),
  credencialesInvalidas: () =>
    new ErrorApp(401, 'El correo o la contrasena no son correctos'),
  sesionExpirada: () =>
    new ErrorApp(401, 'Tu sesion vencio. Volve a iniciar sesion.'),

  // 403 - sabemos quien sos, pero no podes
  sinPermiso: (mensaje = 'No tenes permiso para hacer esto') => new ErrorApp(403, mensaje),

  // 404
  noEncontrado: (que = 'El recurso') => new ErrorApp(404, `${que} no existe`),

  // 409
  conflicto: (mensaje) => new ErrorApp(409, mensaje),

  // 429
  demasiadosIntentos: () =>
    new ErrorApp(429, 'Demasiados intentos. Espera unos minutos y volve a probar.'),
};
