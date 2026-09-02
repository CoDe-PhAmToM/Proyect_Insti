// ============================================================
// RUTAS: CATEGORIAS
// Las globales vienen precargadas (las "plantillas digitales" del
// objetivo 2) y cada taller puede sumar las suyas.
// ============================================================

import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { errores } from '../lib/errores.js';
import { autenticar } from '../middleware/auth.js';
import { conTaller, exigirTaller, scope } from '../middleware/tenancy.js';
import { validar } from './materiales.js';

export const rutasCategorias = Router();

rutasCategorias.use(autenticar, conTaller, exigirTaller);

const esquema = z.object({
  nombre: z.string().min(2, 'Escribi el nombre de la categoria').max(80).trim(),
  tipo: z.enum(['INGRESO', 'EGRESO', 'RETIRO']),
  esPersonal: z.boolean().default(false),
});

rutasCategorias.get('/', async (req, res) => {
  const categorias = await prisma.categoria.findMany({
    where: { OR: [{ tallerId: null }, scope(req)] },
    orderBy: [{ tipo: 'asc' }, { orden: 'asc' }, { nombre: 'asc' }],
  });

  // Agrupadas por tipo: es como las va a pintar el formulario.
  res.json({
    categorias: categorias.map((c) => ({ ...c, esGlobal: c.tallerId === null })),
    porTipo: {
      INGRESO: categorias.filter((c) => c.tipo === 'INGRESO'),
      EGRESO: categorias.filter((c) => c.tipo === 'EGRESO'),
      RETIRO: categorias.filter((c) => c.tipo === 'RETIRO'),
    },
  });
});

rutasCategorias.post('/', async (req, res) => {
  const datos = validar(esquema, req.body);

  const repetida = await prisma.categoria.findFirst({
    where: {
      nombre: { equals: datos.nombre, mode: 'insensitive' },
      OR: [{ tallerId: null }, scope(req)],
    },
  });
  if (repetida) throw errores.conflicto(`Ya existe una categoria llamada "${datos.nombre}"`);

  const categoria = await prisma.categoria.create({
    data: { ...datos, tallerId: req.tallerId },
  });

  res.status(201).json(categoria);
});

rutasCategorias.delete('/:id', async (req, res) => {
  const existe = await prisma.categoria.findFirst({
    where: { id: req.params.id, ...scope(req) },
  });
  // Solo se borran las propias: las globales son de todos.
  if (!existe) throw errores.noEncontrado('La categoria propia');

  const enUso = await prisma.registro.count({ where: { categoriaId: existe.id } });
  if (enUso > 0) {
    throw errores.conflicto(
      `No se puede borrar: hay ${enUso} movimiento(s) usando esta categoria.`
    );
  }

  await prisma.categoria.delete({ where: { id: existe.id } });
  res.json({ ok: true });
});
