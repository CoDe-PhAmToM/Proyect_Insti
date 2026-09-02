// ============================================================
// AUTENTICACION Y PERMISOS
//
// autenticar   - quien sos (lee el access token)
// permitir     - que rol hace falta para esta ruta
//
// Regla de oro: ninguna ruta de negocio se monta sin autenticar.
// ============================================================

import { verificarAccessToken } from '../lib/tokens.js';
import { prisma } from '../lib/prisma.js';
import { errores } from '../lib/errores.js';

/**
 * Verifica el access token y deja en req.usuario los datos de sesion.
 * No consulta la base: el token ya trae rol y taller, y dura 15 min.
 */
export const autenticar = (req, _res, next) => {
  const header = req.get('authorization') ?? '';
  const [esquema, token] = header.split(' ');

  if (esquema !== 'Bearer' || !token) throw errores.noAutenticado();

  req.usuario = verificarAccessToken(token);
  next();
};

/**
 * Igual que autenticar, pero no falla si no hay token.
 * Para rutas publicas que muestran algo distinto si estas logueado,
 * como el catalogo de la tienda.
 */
export const autenticarOpcional = (req, _res, next) => {
  const header = req.get('authorization') ?? '';
  const [esquema, token] = header.split(' ');

  if (esquema === 'Bearer' && token) {
    try {
      req.usuario = verificarAccessToken(token);
    } catch {
      // Token vencido o invalido en ruta publica: se sigue como anonimo
    }
  }
  next();
};

/**
 * Restringe la ruta a ciertos roles.
 *   router.post('/', autenticar, permitir('PRODUCTOR'), handler)
 */
export const permitir =
  (...roles) =>
  (req, _res, next) => {
    if (!req.usuario) throw errores.noAutenticado();
    if (!roles.includes(req.usuario.rol)) {
      throw errores.sinPermiso(
        'Tu usuario no tiene permiso para esta accion. Consulta con el dueno del taller.'
      );
    }
    next();
  };

/**
 * Verifica contra la base que la cuenta siga activa.
 * Se usa solo en operaciones sensibles: el resto confia en el token,
 * que de todos modos vence en 15 minutos.
 */
export const verificarCuentaActiva = async (req, _res, next) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.usuario.usuarioId },
    select: { activo: true },
  });
  if (!usuario?.activo) throw errores.sinPermiso('Tu cuenta esta desactivada');
  next();
};
