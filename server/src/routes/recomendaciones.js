// ============================================================
// RUTAS: RECOMENDACIONES
//
// Se recalculan al pedirlas si estan viejas. En un taller los
// datos cambian despacio: recalcular en cada carga de pantalla
// seria desperdiciar la base gratuita de Neon.
// ============================================================

import { Router } from 'express';

import { prisma } from '../lib/prisma.js';
import { errores } from '../lib/errores.js';
import { autenticar } from '../middleware/auth.js';
import { conTaller, exigirTaller, scope, bloquearAyudante } from '../middleware/tenancy.js';
import { generarRecomendaciones } from '../services/recomendaciones.js';

export const rutasRecomendaciones = Router();

rutasRecomendaciones.use(autenticar, conTaller, exigirTaller, bloquearAyudante);

const FRESCURA_MINUTOS = 30;

rutasRecomendaciones.get('/', async (req, res) => {
  const forzar = req.query.recalcular === 'true';

  const ultima = await prisma.recomendacion.findFirst({
    where: scope(req),
    orderBy: { generadaEn: 'desc' },
    select: { generadaEn: true },
  });

  const vencida =
    !ultima || Date.now() - ultima.generadaEn.getTime() > FRESCURA_MINUTOS * 60 * 1000;

  let analisis = null;
  if (forzar || vencida) {
    analisis = (await generarRecomendaciones(req.tallerId)).analizado;
  }

  const recomendaciones = await prisma.recomendacion.findMany({
    where: { ...scope(req), descartada: false },
    orderBy: { generadaEn: 'desc' },
  });

  // Si no se recalculo, igual hay que decir sobre que datos se
  // trabajo: la pantalla no puede afirmar nada sin respaldo.
  if (!analisis) {
    const [movimientos, materiales, productos, rango] = await Promise.all([
      prisma.registro.count({ where: { ...scope(req), esLineaBase: false } }),
      prisma.material.count({ where: { ...scope(req), activo: true } }),
      prisma.producto.count({ where: { ...scope(req), activo: true } }),
      prisma.registro.aggregate({
        where: { ...scope(req), esLineaBase: false },
        _min: { fecha: true },
        _max: { fecha: true },
      }),
    ]);
    analisis = {
      movimientos,
      materiales,
      productos,
      desde: rango._min.fecha,
      hasta: rango._max.fecha,
    };
  }

  res.json({
    recomendaciones,
    analizado: analisis,
    generadaEn: recomendaciones[0]?.generadaEn ?? new Date(),
    sinDatos: analisis.movimientos === 0,
  });
});

rutasRecomendaciones.post('/:id/descartar', async (req, res) => {
  const existe = await prisma.recomendacion.findFirst({
    where: { id: req.params.id, ...scope(req) },
  });
  if (!existe) throw errores.noEncontrado('La recomendación');

  await prisma.recomendacion.update({
    where: { id: existe.id },
    data: { descartada: true },
  });

  res.json({ ok: true });
});
