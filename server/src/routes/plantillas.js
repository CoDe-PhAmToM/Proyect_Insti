// ============================================================
// RUTAS: PLANTILLAS DE PRENDAS
//
// El objetivo especifico 2 las pide textualmente: "plantillas
// digitales precargadas que faciliten la migracion de datos desde
// los apuntes fisicos al sistema".
//
// La friccion real que resuelven: para que el sistema calcule el
// costo de una prenda hace falta cargar su receta — cuantos metros
// de tela, cuantos conos de hilo. Un microempresario que recien
// entra no tiene eso escrito en ningun lado, lo tiene en la cabeza.
// Arrancar de una plantilla y corregirla es mucho mas facil que
// armarla desde cero.
//
// Las cantidades salen de consumos tipicos del sector. Se presentan
// como punto de partida, NO como verdad: la pantalla le dice que
// las ajuste a su forma de cortar.
// ============================================================

import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { errores } from '../lib/errores.js';
import { autenticar } from '../middleware/auth.js';
import { conTaller, exigirTaller, scope, bloquearAyudante } from '../middleware/tenancy.js';
import { validar } from './materiales.js';

export const rutasPlantillas = Router();

rutasPlantillas.use(autenticar, conTaller, exigirTaller, bloquearAyudante);

// Materiales que una plantilla necesita. Si el taller no los tiene,
// se ofrecen para crear junto con la prenda.
const MATERIALES_BASE = {
  'TLA-ALG': { nombre: 'Algodón peinado 30/1', categoria: 'Tela',   unidad: 'metro',  precio: 28.5 },
  'TLA-PIQ': { nombre: 'Polialgodón piqué',    categoria: 'Tela',   unidad: 'metro',  precio: 22.0 },
  'TLA-POL': { nombre: 'Polar antipilling',    categoria: 'Tela',   unidad: 'metro',  precio: 35.0 },
  'TLA-FRA': { nombre: 'Franela perchada',     categoria: 'Tela',   unidad: 'metro',  precio: 30.0 },
  'HIL-POL': { nombre: 'Hilo poliéster',       categoria: 'Hilo',   unidad: 'cono',   precio: 12.0 },
  'ETQ-MAR': { nombre: 'Etiqueta de marca',    categoria: 'Insumo', unidad: 'unidad', precio: 0.85 },
  'CRR-60':  { nombre: 'Cierre 60 cm',         categoria: 'Insumo', unidad: 'unidad', precio: 8.5 },
  'ELA-RIB': { nombre: 'Elástico ribete',      categoria: 'Insumo', unidad: 'metro',  precio: 3.2 },
  'COR-CAP': { nombre: 'Cordón para capucha',  categoria: 'Insumo', unidad: 'metro',  precio: 2.5 },
  'BTN-18':  { nombre: 'Botón 18 mm',          categoria: 'Insumo', unidad: 'unidad', precio: 1.2 },
};

export const PLANTILLAS = [
  {
    id: 'polera-basica',
    nombre: 'Polera básica',
    categoria: 'Poleras',
    emoji: '👕',
    descripcion: 'Algodón peinado, cuello redondo',
    precioSugerido: 65,
    manoObra: 8.5,
    receta: [
      { codigo: 'TLA-ALG', cantidad: 1.4 },
      { codigo: 'HIL-POL', cantidad: 0.05 },
      { codigo: 'ETQ-MAR', cantidad: 1 },
    ],
  },
  {
    id: 'polera-manga-larga',
    nombre: 'Polera manga larga',
    categoria: 'Poleras',
    emoji: '👕',
    descripcion: 'Algodón peinado, puños reforzados',
    precioSugerido: 85,
    manoObra: 11,
    receta: [
      { codigo: 'TLA-ALG', cantidad: 1.9 },
      { codigo: 'HIL-POL', cantidad: 0.07 },
      { codigo: 'ELA-RIB', cantidad: 0.4 },
      { codigo: 'ETQ-MAR', cantidad: 1 },
    ],
  },
  {
    id: 'polo-deportivo',
    nombre: 'Polo deportivo',
    categoria: 'Deportivo',
    emoji: '👕',
    descripcion: 'Polialgodón piqué, cuello con solapa',
    precioSugerido: 75,
    manoObra: 10,
    receta: [
      { codigo: 'TLA-PIQ', cantidad: 1.3 },
      { codigo: 'HIL-POL', cantidad: 0.06 },
      { codigo: 'BTN-18', cantidad: 3 },
      { codigo: 'ETQ-MAR', cantidad: 1 },
    ],
  },
  {
    id: 'chamarra-cierre',
    nombre: 'Chamarra con cierre',
    categoria: 'Chamarras',
    emoji: '🧥',
    descripcion: 'Polar antipilling, para el frío alteño',
    precioSugerido: 220,
    manoObra: 22,
    receta: [
      { codigo: 'TLA-POL', cantidad: 2.2 },
      { codigo: 'CRR-60', cantidad: 1 },
      { codigo: 'HIL-POL', cantidad: 0.15 },
      { codigo: 'ELA-RIB', cantidad: 1.2 },
      { codigo: 'ETQ-MAR', cantidad: 1 },
    ],
  },
  {
    id: 'buzo-capucha',
    nombre: 'Buzo con capucha',
    categoria: 'Buzos',
    emoji: '🧥',
    descripcion: 'Franela perchada, bolsillo canguro',
    precioSugerido: 145,
    manoObra: 18,
    receta: [
      { codigo: 'TLA-FRA', cantidad: 2.0 },
      { codigo: 'HIL-POL', cantidad: 0.12 },
      { codigo: 'COR-CAP', cantidad: 1.4 },
      { codigo: 'ELA-RIB', cantidad: 1.0 },
      { codigo: 'ETQ-MAR', cantidad: 1 },
    ],
  },
];

// ── GET / ────────────────────────────────────────────────────

rutasPlantillas.get('/', async (req, res) => {
  const [materiales, productos] = await Promise.all([
    prisma.material.findMany({ where: scope(req), select: { codigo: true } }),
    prisma.producto.findMany({ where: scope(req), select: { sku: true, nombre: true } }),
  ]);

  const codigosQueTiene = new Set(materiales.map((m) => m.codigo));
  const nombresQueTiene = new Set(productos.map((p) => p.nombre.toLowerCase()));

  res.json({
    plantillas: PLANTILLAS.map((p) => ({
      ...p,
      yaLaTiene: nombresQueTiene.has(p.nombre.toLowerCase()),
      materialesFaltantes: p.receta
        .filter((r) => !codigosQueTiene.has(r.codigo))
        .map((r) => ({ codigo: r.codigo, ...MATERIALES_BASE[r.codigo] })),
    })),
    aviso:
      'Estas cantidades son consumos típicos del sector. Usalas como punto de partida y ajustalas a tu forma de cortar: nadie corta igual.',
  });
});

// ── POST /:id/usar ───────────────────────────────────────────

rutasPlantillas.post('/:id/usar', async (req, res) => {
  const plantilla = PLANTILLAS.find((p) => p.id === req.params.id);
  if (!plantilla) throw errores.noEncontrado('Esa plantilla');

  const datos = validar(
    z.object({
      nombre: z.string().min(2).max(120).trim().optional(),
      precioVenta: z.coerce.number().min(0).optional(),
      crearMateriales: z.boolean().default(true),
    }),
    req.body ?? {}
  );

  const nombre = datos.nombre ?? plantilla.nombre;

  const repetido = await prisma.producto.findFirst({
    where: { ...scope(req), nombre: { equals: nombre, mode: 'insensitive' } },
  });
  if (repetido) throw errores.conflicto(`Ya tenés una prenda llamada "${nombre}"`);

  const resultado = await prisma.$transaction(async (tx) => {
    const existentes = await tx.material.findMany({
      where: { tallerId: req.tallerId },
      select: { id: true, codigo: true },
    });
    const porCodigo = new Map(existentes.map((m) => [m.codigo, m.id]));
    const creados = [];

    // Se crean solo los materiales que le faltan al taller
    for (const linea of plantilla.receta) {
      if (porCodigo.has(linea.codigo)) continue;
      if (!datos.crearMateriales) {
        throw errores.datosInvalidos(
          `Te falta el material ${MATERIALES_BASE[linea.codigo].nombre}. Cargalo primero o dejá que el sistema lo cree.`
        );
      }
      const base = MATERIALES_BASE[linea.codigo];
      const m = await tx.material.create({
        data: {
          tallerId: req.tallerId,
          codigo: linea.codigo,
          nombre: base.nombre,
          categoria: base.categoria,
          unidad: base.unidad,
          precioUnitario: base.precio,
          stock: 0,
          stockMinimo: 0,
        },
      });
      porCodigo.set(linea.codigo, m.id);
      creados.push(base.nombre);
    }

    // SKU libre: si POL-001 está ocupado, prueba POL-002
    const base = plantilla.id.slice(0, 3).toUpperCase();
    let sku = '';
    for (let n = 1; n < 999; n++) {
      const intento = `${base}-${String(n).padStart(3, '0')}`;
      const ocupado = await tx.producto.findFirst({
        where: { tallerId: req.tallerId, sku: intento },
      });
      if (!ocupado) {
        sku = intento;
        break;
      }
    }

    const producto = await tx.producto.create({
      data: {
        tallerId: req.tallerId,
        sku,
        nombre,
        descripcion: plantilla.descripcion,
        categoria: plantilla.categoria,
        emoji: plantilla.emoji,
        precioVenta: datos.precioVenta ?? plantilla.precioSugerido,
        manoObraUnitaria: plantilla.manoObra,
      },
    });

    await tx.productoMaterial.createMany({
      data: plantilla.receta.map((r) => ({
        productoId: producto.id,
        materialId: porCodigo.get(r.codigo),
        cantidad: r.cantidad,
      })),
    });

    return { producto, creados };
  });

  res.status(201).json({
    id: resultado.producto.id,
    nombre: resultado.producto.nombre,
    sku: resultado.producto.sku,
    materialesCreados: resultado.creados,
    mensaje:
      resultado.creados.length > 0
        ? `Se creó "${nombre}" y se agregaron ${resultado.creados.length} material(es) a tu inventario. Ajustá los precios y el stock a lo que tengas de verdad.`
        : `Se creó "${nombre}" con su receta. Revisá las cantidades: cada taller corta distinto.`,
  });
});
