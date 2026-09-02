// ============================================================
// RUTAS: MATERIALES E INVENTARIO
// Objetivo especifico 2: registro de inventarios con validaciones
// que aseguren la integridad de la informacion.
// ============================================================

import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { errores } from '../lib/errores.js';
import { autenticar } from '../middleware/auth.js';
import { conTaller, exigirTaller, scope } from '../middleware/tenancy.js';
import { registrarMovimiento, obtenerKardex } from '../services/kardex.js';
import { estadoStock } from 'shared/validacion';

export const rutasMateriales = Router();

rutasMateriales.use(autenticar, conTaller, exigirTaller);

// ── Validacion ───────────────────────────────────────────────

const UNIDADES = ['metro', 'cono', 'rollo', 'unidad', 'kg', 'litro', 'docena'];

const esquemaMaterial = z.object({
  codigo: z.string().min(1, 'Falta el codigo').max(30).trim().toUpperCase(),
  nombre: z.string().min(2, 'Falta el nombre del material').max(120).trim(),
  categoria: z.string().min(1, 'Elegi una categoria').max(40).trim(),
  unidad: z.enum(UNIDADES, { message: `Unidad invalida. Usa una de: ${UNIDADES.join(', ')}` }),
  precioUnitario: z.coerce.number().min(0, 'El precio no puede ser negativo').max(1_000_000),
  stock: z.coerce.number().min(0, 'El stock no puede ser negativo').max(10_000_000).default(0),
  stockMinimo: z.coerce.number().min(0, 'El minimo no puede ser negativo').max(10_000_000).default(0),
});

const esquemaMovimiento = z.object({
  tipo: z.enum(['ENTRADA', 'SALIDA', 'AJUSTE']),
  cantidad: z.coerce.number().positive('La cantidad tiene que ser mayor a 0'),
  costoUnitario: z.coerce.number().min(0).optional(),
  fecha: z.string().date('Fecha invalida').optional(),
  motivo: z.string().max(200).trim().optional(),
});

export const validar = (esquema, cuerpo) => {
  const r = esquema.safeParse(cuerpo);
  if (!r.success) {
    const detalles = Object.fromEntries(r.error.issues.map((i) => [i.path.join('.'), i.message]));
    throw errores.datosInvalidos('Revisa los datos del formulario', detalles);
  }
  return r.data;
};

// El estado (ok / bajo / critico) se deriva, nunca lo escribe el usuario.
const conEstado = (m) => ({
  ...m,
  precioUnitario: Number(m.precioUnitario),
  stock: Number(m.stock),
  stockMinimo: Number(m.stockMinimo),
  estado: estadoStock(m.stock, m.stockMinimo),
  valorInventario: Number((Number(m.stock) * Number(m.precioUnitario)).toFixed(2)),
});

// ── GET / ────────────────────────────────────────────────────

rutasMateriales.get('/', async (req, res) => {
  const materiales = await prisma.material.findMany({
    where: { ...scope(req), activo: true },
    orderBy: [{ categoria: 'asc' }, { codigo: 'asc' }],
  });

  const lista = materiales.map(conEstado);

  res.json({
    materiales: lista,
    resumen: {
      total: lista.length,
      valorInventario: Number(lista.reduce((a, m) => a + m.valorInventario, 0).toFixed(2)),
      criticos: lista.filter((m) => m.estado === 'critico').length,
      bajos: lista.filter((m) => m.estado === 'bajo').length,
    },
  });
});

// ── GET /:id ─────────────────────────────────────────────────

rutasMateriales.get('/:id', async (req, res) => {
  const material = await prisma.material.findFirst({
    where: { id: req.params.id, ...scope(req) },
  });
  if (!material) throw errores.noEncontrado('El material');
  res.json(conEstado(material));
});

// ── POST / ───────────────────────────────────────────────────
// El stock inicial entra como movimiento de kardex, no como un
// numero suelto: el inventario arranca cuadrado desde el dia uno.

rutasMateriales.post('/', async (req, res) => {
  const datos = validar(esquemaMaterial, req.body);

  const repetido = await prisma.material.findFirst({
    where: { ...scope(req), codigo: datos.codigo },
  });
  if (repetido) throw errores.conflicto(`Ya existe un material con el codigo ${datos.codigo}`);

  const material = await prisma.$transaction(async (tx) => {
    const creado = await tx.material.create({
      data: { ...datos, stock: 0, tallerId: req.tallerId },
    });

    if (datos.stock > 0) {
      await registrarMovimiento({
        tallerId: req.tallerId,
        materialId: creado.id,
        tipo: 'ENTRADA',
        cantidad: datos.stock,
        costoUnitario: datos.precioUnitario,
        motivo: 'Inventario inicial',
        tx,
      });
    }

    return tx.material.findUnique({ where: { id: creado.id } });
  });

  res.status(201).json(conEstado(material));
});

// ── PATCH /:id ───────────────────────────────────────────────
// Nota: el stock NO se edita por aca. Cambiarlo a mano rompe el
// kardex; para eso esta el movimiento de tipo AJUSTE.

rutasMateriales.patch('/:id', async (req, res) => {
  const existe = await prisma.material.findFirst({
    where: { id: req.params.id, ...scope(req) },
  });
  if (!existe) throw errores.noEncontrado('El material');

  const datos = validar(esquemaMaterial.partial().omit({ stock: true }), req.body);

  if (datos.codigo && datos.codigo !== existe.codigo) {
    const repetido = await prisma.material.findFirst({
      where: { ...scope(req), codigo: datos.codigo, id: { not: existe.id } },
    });
    if (repetido) throw errores.conflicto(`Ya existe un material con el codigo ${datos.codigo}`);
  }

  const material = await prisma.material.update({
    where: { id: existe.id },
    data: datos,
  });

  res.json(conEstado(material));
});

// ── DELETE /:id ──────────────────────────────────────────────
// Baja logica: si el material participo de alguna receta o de algun
// consumo, borrarlo de verdad destruiria el historial de costos.

rutasMateriales.delete('/:id', async (req, res) => {
  const existe = await prisma.material.findFirst({
    where: { id: req.params.id, ...scope(req) },
  });
  if (!existe) throw errores.noEncontrado('El material');

  const enUso = await prisma.productoMaterial.count({ where: { materialId: existe.id } });
  if (enUso > 0) {
    await prisma.material.update({ where: { id: existe.id }, data: { activo: false } });
    return res.json({
      ok: true,
      archivado: true,
      mensaje: `${existe.nombre} se archivo en vez de borrarse porque forma parte de ${enUso} receta(s). El historial de costos se conserva.`,
    });
  }

  const conMovimientos = await prisma.movimientoMaterial.count({ where: { materialId: existe.id } });
  if (conMovimientos > 1) {
    await prisma.material.update({ where: { id: existe.id }, data: { activo: false } });
    return res.json({
      ok: true,
      archivado: true,
      mensaje: `${existe.nombre} se archivo para conservar su kardex.`,
    });
  }

  await prisma.$transaction([
    prisma.movimientoMaterial.deleteMany({ where: { materialId: existe.id } }),
    prisma.material.delete({ where: { id: existe.id } }),
  ]);

  res.json({ ok: true, archivado: false });
});

// ── POST /:id/movimientos ────────────────────────────────────

rutasMateriales.post('/:id/movimientos', async (req, res) => {
  const datos = validar(esquemaMovimiento, req.body);

  const { movimiento, material } = await registrarMovimiento({
    tallerId: req.tallerId,
    materialId: req.params.id,
    ...datos,
  });

  res.status(201).json({
    movimiento: {
      ...movimiento,
      cantidad: Number(movimiento.cantidad),
      costoUnitario: Number(movimiento.costoUnitario),
      saldoCantidad: Number(movimiento.saldoCantidad),
      saldoValor: Number(movimiento.saldoValor),
    },
    material: conEstado(material),
  });
});

// ── GET /:id/kardex ──────────────────────────────────────────

rutasMateriales.get('/:id/kardex', async (req, res) => {
  const kardex = await obtenerKardex({
    tallerId: req.tallerId,
    materialId: req.params.id,
    desde: req.query.desde,
    hasta: req.query.hasta,
  });
  res.json(kardex);
});
