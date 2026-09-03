// ============================================================
// RUTAS: ESCALA SUS (System Usability Scale)
//
// El documento la promete como instrumento de la Fase II —
// "escala de usabilidad SUS, administrada al final de la prueba
// piloto" — y hasta ahora no existia en ningun lado.
//
// Son los 10 items estandar de Brooke (1996), traducidos al
// castellano llano que usa el resto del sistema. La traduccion
// importa: el original habla de "cumbersome" y "technical support
// person", que no significan nada para una confeccionista.
//
// El puntaje va de 0 a 100 pero NO es un porcentaje. La escala
// tiene su propia interpretacion: 68 es el promedio de la
// industria, no un aprobado raspando.
// ============================================================

import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { errores } from '../lib/errores.js';
import { autenticar, permitir } from '../middleware/auth.js';
import { validar } from './materiales.js';

export const rutasSus = Router();

rutasSus.use(autenticar);

// Los 10 items. Los pares son de redaccion invertida: una
// puntuacion alta ahi indica un problema, no una virtud.
export const ITEMS_SUS = [
  { n: 1,  invertido: false, texto: 'Me gustaría usar este sistema seguido' },
  { n: 2,  invertido: true,  texto: 'El sistema me parece más complicado de lo necesario' },
  { n: 3,  invertido: false, texto: 'El sistema me resultó fácil de usar' },
  { n: 4,  invertido: true,  texto: 'Necesitaría que alguien me ayude para poder usarlo' },
  { n: 5,  invertido: false, texto: 'Las distintas partes del sistema encajan bien entre sí' },
  { n: 6,  invertido: true,  texto: 'Hay demasiadas cosas que no son coherentes en el sistema' },
  { n: 7,  invertido: false, texto: 'Me imagino que la mayoría aprendería a usarlo rápido' },
  { n: 8,  invertido: true,  texto: 'El sistema me resultó incómodo o pesado de usar' },
  { n: 9,  invertido: false, texto: 'Me sentí seguro usando el sistema' },
  { n: 10, invertido: true,  texto: 'Tuve que aprender muchas cosas antes de poder usarlo' },
];

/**
 * Puntaje SUS segun Brooke (1996):
 *   items impares: respuesta - 1
 *   items pares:   5 - respuesta
 *   sumar todo y multiplicar por 2.5
 */
export const calcularSus = (respuestas) => {
  const suma = respuestas.reduce((acc, r, i) => {
    const item = ITEMS_SUS[i];
    return acc + (item.invertido ? 5 - r : r - 1);
  }, 0);
  return Number((suma * 2.5).toFixed(2));
};

/** Interpretacion estandar, para no dejar el numero solo. */
export const interpretar = (puntaje) => {
  if (puntaje >= 85) return { letra: 'A', adjetivo: 'excelente', percentil: 'mejor que el 90 % de los sistemas medidos' };
  if (puntaje >= 72) return { letra: 'B', adjetivo: 'buena', percentil: 'por encima del promedio' };
  if (puntaje >= 68) return { letra: 'C', adjetivo: 'aceptable', percentil: 'en el promedio de la industria' };
  if (puntaje >= 51) return { letra: 'D', adjetivo: 'floja', percentil: 'por debajo del promedio' };
  return { letra: 'F', adjetivo: 'mala', percentil: 'requiere rediseño' };
};

// ── GET /cuestionario ────────────────────────────────────────

rutasSus.get('/cuestionario', async (req, res) => {
  const yaRespondio = await prisma.respuestaSus.findUnique({
    where: { usuarioId: req.usuario.usuarioId },
    select: { creadoEn: true, puntaje: true },
  });

  res.json({
    items: ITEMS_SUS.map(({ n, texto }) => ({ n, texto })),
    escala: [
      { valor: 1, etiqueta: 'Para nada de acuerdo' },
      { valor: 2, etiqueta: 'Poco de acuerdo' },
      { valor: 3, etiqueta: 'Más o menos' },
      { valor: 4, etiqueta: 'Bastante de acuerdo' },
      { valor: 5, etiqueta: 'Totalmente de acuerdo' },
    ],
    yaRespondio: Boolean(yaRespondio),
    respondidoEn: yaRespondio?.creadoEn ?? null,
  });
});

// ── POST / ───────────────────────────────────────────────────

const esquema = z.object({
  respuestas: z
    .array(z.coerce.number().int().min(1).max(5))
    .length(10, 'Faltan preguntas por responder'),
  comentario: z.string().max(1000).trim().nullish(),
});

rutasSus.post('/', async (req, res) => {
  const datos = validar(esquema, req.body);

  const yaRespondio = await prisma.respuestaSus.findUnique({
    where: { usuarioId: req.usuario.usuarioId },
  });
  if (yaRespondio) {
    throw errores.conflicto('Ya respondiste este cuestionario. Gracias.');
  }

  const puntaje = calcularSus(datos.respuestas);

  await prisma.respuestaSus.create({
    data: {
      usuarioId: req.usuario.usuarioId,
      tallerId: req.usuario.tallerId ?? null,
      respuestas: datos.respuestas,
      puntaje,
      comentario: datos.comentario ?? null,
    },
  });

  // Al participante no se le devuelve el puntaje: no es una nota
  // que se saco, y verlo podria condicionar lo que le cuente a otro
  // taller del piloto.
  res.status(201).json({
    ok: true,
    mensaje: 'Gracias. Tus respuestas ayudan a mejorar el sistema.',
  });
});

// ── GET /resultados — solo el equipo investigador ────────────

rutasSus.get('/resultados', permitir('ADMIN'), async (req, res) => {
  const respuestas = await prisma.respuestaSus.findMany({
    where: req.query.tallerId ? { tallerId: req.query.tallerId } : {},
    include: { taller: { select: { nombre: true } } },
    orderBy: { creadoEn: 'asc' },
  });

  if (respuestas.length === 0) {
    return res.json({
      respuestas: [],
      n: 0,
      aviso:
        'Todavía nadie respondió el cuestionario SUS. Se administra al cerrar el piloto, no antes.',
    });
  }

  const puntajes = respuestas.map((r) => Number(r.puntaje));
  const promedio = Number((puntajes.reduce((a, p) => a + p, 0) / puntajes.length).toFixed(2));

  // Desviacion estandar muestral (n-1), que es la que corresponde
  // cuando se generaliza a una poblacion.
  const desviacion =
    puntajes.length > 1
      ? Number(
          Math.sqrt(
            puntajes.reduce((a, p) => a + (p - promedio) ** 2, 0) / (puntajes.length - 1)
          ).toFixed(2)
        )
      : null;

  const ordenados = [...puntajes].sort((a, b) => a - b);
  const mediana =
    ordenados.length % 2
      ? ordenados[(ordenados.length - 1) / 2]
      : Number(((ordenados[ordenados.length / 2 - 1] + ordenados[ordenados.length / 2]) / 2).toFixed(2));

  // Promedio por item: senala CUAL es el problema, no solo que hay
  // uno. Un item invertido con promedio alto es una alarma.
  const porItem = ITEMS_SUS.map((item, i) => {
    const vals = respuestas.map((r) => r.respuestas[i]);
    return {
      n: item.n,
      texto: item.texto,
      invertido: item.invertido,
      promedio: Number((vals.reduce((a, v) => a + v, 0) / vals.length).toFixed(2)),
    };
  });

  res.json({
    respuestas: respuestas.map((r) => ({
      id: r.id,
      taller: r.taller?.nombre ?? null,
      puntaje: Number(r.puntaje),
      comentario: r.comentario,
      creadoEn: r.creadoEn,
    })),
    n: respuestas.length,
    promedio,
    mediana,
    desviacion,
    interpretacion: interpretar(promedio),
    porItem,
    aviso:
      respuestas.length < 5
        ? `Con ${respuestas.length} respuesta${respuestas.length !== 1 ? 's' : ''} el promedio es orientativo. La escala SUS se estabiliza a partir de unas 8.`
        : null,
  });
});
