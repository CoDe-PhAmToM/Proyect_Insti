// ============================================================
// AISLAMIENTO ENTRE TALLERES
//
// Esta es la pieza mas delicada del sistema. En el piloto conviven
// datos financieros reales de varios microempresarios: la platita
// de Maria no puede aparecer jamas en la pantalla de Rosa.
//
// El middleware resuelve UN solo tallerId y lo deja en req.tallerId.
// Toda consulta de negocio se filtra por ahi. Nunca se toma el
// tallerId de lo que manda el cliente sin verificar la membresia.
// ============================================================

import { prisma } from '../lib/prisma.js';
import { errores } from '../lib/errores.js';

/**
 * Resuelve a que taller pertenece esta peticion.
 *
 *  PRODUCTOR / AYUDANTE  el taller donde estan afiliados. Si piden
 *                        otro, es 403 aunque el id exista.
 *  ADMIN                 puede mirar un taller concreto pasando
 *                        ?tallerId=... (para exportar el piloto).
 *                        Sin ese parametro, req.tallerId queda nulo
 *                        y la ruta debe devolver la vista agregada.
 *  CLIENTE               no tiene taller propio.
 */
export const conTaller = async (req, _res, next) => {
  if (!req.usuario) throw errores.noAutenticado();

  const { usuarioId, rol } = req.usuario;
  const pedido = req.query.tallerId ?? req.params.tallerId ?? null;

  if (rol === 'ADMIN') {
    req.tallerId = pedido || null;
    req.esAdmin = true;
    return next();
  }

  if (rol === 'CLIENTE') {
    throw errores.sinPermiso('Esta seccion es para talleres, no para clientes');
  }

  const membresias = await prisma.usuarioTaller.findMany({
    where: { usuarioId },
    select: { tallerId: true, rolEnTaller: true },
  });

  if (membresias.length === 0) {
    throw errores.sinPermiso(
      'Tu usuario todavia no esta asignado a ningun taller. Pedile al dueno que te agregue.'
    );
  }

  // Si pidio un taller explicito, tiene que ser uno de los suyos.
  if (pedido) {
    const suyo = membresias.find((m) => m.tallerId === pedido);
    // Mismo mensaje exista o no el taller: no filtramos que ids son reales.
    if (!suyo) throw errores.sinPermiso('No tenes acceso a ese taller');
    req.tallerId = suyo.tallerId;
    req.rolEnTaller = suyo.rolEnTaller;
    return next();
  }

  req.tallerId = membresias[0].tallerId;
  req.rolEnTaller = membresias[0].rolEnTaller;
  next();
};

/**
 * Para rutas que no admiten la vista agregada del admin: exigen un
 * taller concreto. Evita consultas sin filtro por descuido.
 */
export const exigirTaller = (req, _res, next) => {
  if (!req.tallerId) {
    throw errores.datosInvalidos(
      'Falta indicar el taller. Agrega ?tallerId=... a la consulta.'
    );
  }
  next();
};

/**
 * Filtro obligatorio para toda consulta de negocio.
 *   prisma.registro.findMany({ where: { ...scope(req), tipo: 'INGRESO' } })
 *
 * Lanza si no hay taller resuelto: preferimos romper la peticion antes
 * que devolver por error datos de todos los talleres.
 */
export const scope = (req) => {
  if (!req.tallerId) {
    throw errores.datosInvalidos('Esta consulta necesita un taller definido');
  }
  return { tallerId: req.tallerId };
};

/**
 * El ayudante registra movimientos pero no ve plata fina: margenes,
 * costos unitarios ni rentabilidad. Responde al problema que nombra
 * la tesis, la imposibilidad de delegar sin entregar todo el negocio.
 */
export const bloquearAyudante = (req, _res, next) => {
  if (req.usuario?.rol === 'AYUDANTE' || req.rolEnTaller === 'AYUDANTE') {
    throw errores.sinPermiso('Solo el dueno del taller puede ver los costos y margenes');
  }
  next();
};
