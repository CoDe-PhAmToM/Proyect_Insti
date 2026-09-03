// ============================================================
// RUTAS: PRODUCTOS Y RECETAS
// La receta liga cada prenda a los materiales del inventario por
// id, no por nombre: si cambia el precio de la tela, el costo del
// producto cambia solo.
// ============================================================

import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { errores } from '../lib/errores.js';
import { autenticar } from '../middleware/auth.js';
import { conTaller, exigirTaller, scope, bloquearAyudante } from '../middleware/tenancy.js';
import { validar } from './materiales.js';
import { valorizarReceta, margenBrutoPct } from 'shared/costeo';
import { guardarEstampado } from '../services/imagenes.js';

export const rutasProductos = Router();

rutasProductos.use(autenticar, conTaller, exigirTaller);

const esquemaProducto = z.object({
  sku: z.string().min(1, 'Falta el codigo del producto').max(30).trim().toUpperCase(),
  nombre: z.string().min(2, 'Falta el nombre').max(120).trim(),
  descripcion: z.string().max(300).trim().nullish(),
  categoria: z.string().max(40).trim().nullish(),
  emoji: z.string().max(8).nullish(),
  precioVenta: z.coerce.number().min(0, 'El precio no puede ser negativo').max(1_000_000),
  manoObraUnitaria: z.coerce.number().min(0).max(1_000_000).default(0),
  publicadoEnTienda: z.boolean().default(false),
});

const esquemaReceta = z.object({
  items: z
    .array(
      z.object({
        materialId: z.string().uuid(),
        cantidad: z.coerce.number().positive('La cantidad tiene que ser mayor a 0'),
      })
    )
    .min(1, 'La receta necesita al menos un material'),
});

const aNumero = (p) => ({
  ...p,
  precioVenta: Number(p.precioVenta),
  manoObraUnitaria: Number(p.manoObraUnitaria),
});

// ── GET / ────────────────────────────────────────────────────
// Devuelve cada producto ya costeado contra los precios vigentes.

rutasProductos.get('/', async (req, res) => {
  const [productos, materiales] = await Promise.all([
    prisma.producto.findMany({
      where: { ...scope(req), activo: true },
      orderBy: { nombre: 'asc' },
      include: { receta: true },
    }),
    prisma.material.findMany({ where: scope(req) }),
  ]);

  const mats = materiales.map((m) => ({ ...m, precioUnitario: Number(m.precioUnitario) }));
  const esAyudante = req.usuario.rol === 'AYUDANTE' || req.rolEnTaller === 'AYUDANTE';

  const lista = productos.map((p) => {
    const base = { ...aNumero(p), receta: undefined };

    // El ayudante ve el catalogo pero no los costos ni los margenes.
    if (esAyudante) return base;

    const val = valorizarReceta(
      p.receta.map((r) => ({ materialId: r.materialId, cantidad: Number(r.cantidad) })),
      mats
    );
    const costoTotal = Number(
      (val.subtotal + Number(p.manoObraUnitaria)).toFixed(2)
    );

    return {
      ...base,
      costoMateriales: val.subtotal,
      costoTotal,
      margenBrutoPct: margenBrutoPct(Number(p.precioVenta), costoTotal),
      hayFaltantes: val.hayFaltantes,
    };
  });

  res.json({ productos: lista });
});

// ── GET /:id ─────────────────────────────────────────────────

rutasProductos.get('/:id', async (req, res) => {
  const producto = await prisma.producto.findFirst({
    where: { id: req.params.id, ...scope(req) },
    include: { receta: { include: { material: true } } },
  });
  if (!producto) throw errores.noEncontrado('El producto');

  const materiales = await prisma.material.findMany({ where: scope(req) });
  const mats = materiales.map((m) => ({ ...m, precioUnitario: Number(m.precioUnitario) }));

  const val = valorizarReceta(
    producto.receta.map((r) => ({ materialId: r.materialId, cantidad: Number(r.cantidad) })),
    mats
  );

  res.json({
    ...aNumero(producto),
    receta: val.lineas,
    costoMateriales: val.subtotal,
    costoTotal: Number((val.subtotal + Number(producto.manoObraUnitaria)).toFixed(2)),
    hayFaltantes: val.hayFaltantes,
  });
});

// ── POST / ───────────────────────────────────────────────────

rutasProductos.post('/', bloquearAyudante, async (req, res) => {
  const datos = validar(esquemaProducto, req.body);

  const repetido = await prisma.producto.findFirst({
    where: { ...scope(req), sku: datos.sku },
  });
  if (repetido) throw errores.conflicto(`Ya existe un producto con el codigo ${datos.sku}`);

  const producto = await prisma.producto.create({
    data: { ...datos, tallerId: req.tallerId },
  });

  res.status(201).json(aNumero(producto));
});

// ── PATCH /:id ───────────────────────────────────────────────

rutasProductos.patch('/:id', bloquearAyudante, async (req, res) => {
  const existe = await prisma.producto.findFirst({
    where: { id: req.params.id, ...scope(req) },
  });
  if (!existe) throw errores.noEncontrado('El producto');

  const datos = validar(esquemaProducto.partial(), req.body);

  if (datos.sku && datos.sku !== existe.sku) {
    const repetido = await prisma.producto.findFirst({
      where: { ...scope(req), sku: datos.sku, id: { not: existe.id } },
    });
    if (repetido) throw errores.conflicto(`Ya existe un producto con el codigo ${datos.sku}`);
  }

  const producto = await prisma.producto.update({ where: { id: existe.id }, data: datos });
  res.json(aNumero(producto));
});

// ── PUT /:id/receta ──────────────────────────────────────────
// Reemplaza la receta completa. Es mas simple de razonar que ir
// agregando y quitando materiales de a uno.

rutasProductos.put('/:id/receta', bloquearAyudante, async (req, res) => {
  const producto = await prisma.producto.findFirst({
    where: { id: req.params.id, ...scope(req) },
  });
  if (!producto) throw errores.noEncontrado('El producto');

  const { items } = validar(esquemaReceta, req.body);

  // Todos los materiales tienen que ser de este taller.
  const ids = [...new Set(items.map((i) => i.materialId))];
  const encontrados = await prisma.material.findMany({
    where: { id: { in: ids }, ...scope(req) },
    select: { id: true },
  });
  if (encontrados.length !== ids.length) {
    throw errores.datosInvalidos('Alguno de los materiales no existe en tu inventario');
  }

  await prisma.$transaction([
    prisma.productoMaterial.deleteMany({ where: { productoId: producto.id } }),
    prisma.productoMaterial.createMany({
      data: items.map((i) => ({ productoId: producto.id, materialId: i.materialId, cantidad: i.cantidad })),
    }),
  ]);

  const actualizado = await prisma.producto.findUnique({
    where: { id: producto.id },
    include: { receta: { include: { material: true } } },
  });

  res.json({
    ...aNumero(actualizado),
    receta: actualizado.receta.map((r) => ({
      materialId: r.materialId,
      nombre: r.material.nombre,
      unidad: r.material.unidad,
      cantidad: Number(r.cantidad),
      precioUnitario: Number(r.material.precioUnitario),
    })),
  });
});

// ── PUT /:id/foto ────────────────────────────────────────────
// Hasta ahora el catalogo mostraba emojis. Una foto real de la
// prenda vende mucho mas que un dibujo generico.

rutasProductos.put('/:id/foto', bloquearAyudante, async (req, res) => {
  const producto = await prisma.producto.findFirst({
    where: { id: req.params.id, ...scope(req) },
  });
  if (!producto) throw errores.noEncontrado('El producto');

  const url = await guardarEstampado(req.body?.foto);

  const actualizado = await prisma.producto.update({
    where: { id: producto.id },
    data: { imagenUrl: url },
    select: { id: true, nombre: true, imagenUrl: true },
  });

  res.json({
    ...actualizado,
    mensaje: url ? 'Foto cargada.' : 'Se quitó la foto.',
  });
});

// ── DELETE /:id ──────────────────────────────────────────────

rutasProductos.delete('/:id', bloquearAyudante, async (req, res) => {
  const existe = await prisma.producto.findFirst({
    where: { id: req.params.id, ...scope(req) },
  });
  if (!existe) throw errores.noEncontrado('El producto');

  const enOrdenes = await prisma.ordenDetalle.count({ where: { productoId: existe.id } });
  const enVentas = await prisma.registro.count({ where: { productoId: existe.id } });

  if (enOrdenes > 0 || enVentas > 0) {
    await prisma.producto.update({ where: { id: existe.id }, data: { activo: false } });
    return res.json({
      ok: true,
      archivado: true,
      mensaje: `${existe.nombre} se archivo porque tiene ventas u ordenes asociadas. El historial se conserva.`,
    });
  }

  await prisma.$transaction([
    prisma.productoMaterial.deleteMany({ where: { productoId: existe.id } }),
    prisma.producto.delete({ where: { id: existe.id } }),
  ]);

  res.json({ ok: true, archivado: false });
});
