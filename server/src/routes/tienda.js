// ============================================================
// RUTAS: TIENDA
//
// El catalogo y el personalizador no estan en los objetivos del
// documento: se construyen por decision del equipo. Para que no
// queden como un anexo suelto, se integran al circuito financiero:
//
//   Cliente arma su prenda y confirma el pedido
//        ↓
//   El productor lo acepta  →  se crea una ORDEN DE PRODUCCION
//        ↓
//   Al entregarse           →  se registra el INGRESO
//
// Asi la tienda deja de ser un anexo y pasa a ser una fuente de
// datos que alimenta los objetivos 2, 3 y 5.
// ============================================================

import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { errores } from '../lib/errores.js';
import { autenticar, permitir } from '../middleware/auth.js';
import { conTaller, exigirTaller, scope } from '../middleware/tenancy.js';
import { validar } from './materiales.js';
import { guardarEstampado } from '../services/imagenes.js';
import { crearOrden } from '../services/ordenes.js';

export const rutasTienda = Router();
export const rutasPedidos = Router();

const dec = (v) => Number(v ?? 0);
const red = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// El estampado personalizado tiene un recargo fijo.
const RECARGO_ESTAMPADO = 15;

// ══════════════════════════════════════════════════════════════
// CATALOGO PUBLICO
// ══════════════════════════════════════════════════════════════

rutasTienda.use(autenticar);

rutasTienda.get('/talleres', async (_req, res) => {
  const talleres = await prisma.taller.findMany({
    where: { activo: true, productos: { some: { publicadoEnTienda: true, activo: true } } },
    select: { id: true, nombre: true, distrito: true },
    orderBy: { nombre: 'asc' },
  });

  res.json({ talleres });
});

rutasTienda.get('/productos', async (req, res) => {
  const { tallerId } = req.query;

  const productos = await prisma.producto.findMany({
    where: { publicadoEnTienda: true, activo: true, ...(tallerId ? { tallerId } : {}) },
    select: {
      id: true, sku: true, nombre: true, descripcion: true, categoria: true,
      emoji: true, imagenUrl: true, precioVenta: true,
      taller: { select: { id: true, nombre: true } },
    },
    orderBy: { nombre: 'asc' },
  });

  const lista = productos.map((p) => ({ ...p, precioVenta: dec(p.precioVenta) }));

  res.json({
    productos: lista,
    categorias: [...new Set(lista.map((p) => p.categoria).filter(Boolean))],
    recargoEstampado: RECARGO_ESTAMPADO,
    aviso:
      lista.length === 0
        ? 'Todavía no hay prendas publicadas en la tienda. El taller tiene que marcarlas como publicadas desde Costeo.'
        : null,
  });
});

// ══════════════════════════════════════════════════════════════
// PEDIDOS
// ══════════════════════════════════════════════════════════════

rutasPedidos.use(autenticar);

const esquemaPedido = z.object({
  tallerId: z.string().uuid('Falta indicar el taller'),
  direccionEntrega: z.string().max(200).trim().nullish(),
  telefonoContacto: z.string().max(30).trim().nullish(),
  notas: z.string().max(500).trim().nullish(),
  items: z
    .array(
      z.object({
        productoId: z.string().uuid(),
        cantidad: z.coerce.number().int().positive().max(1000),
        color: z.string().max(40).nullish(),
        colorHex: z.string().max(9).nullish(),
        talla: z.string().max(10).nullish(),
        estampado: z.string().nullish(),
        posicionJson: z.record(z.string(), z.any()).nullish(),
      })
    )
    .min(1, 'El pedido necesita al menos una prenda'),
});

// ── POST / — el cliente hace un pedido ───────────────────────

rutasPedidos.post('/', permitir('CLIENTE'), async (req, res) => {
  const datos = validar(esquemaPedido, req.body);

  const ids = [...new Set(datos.items.map((i) => i.productoId))];
  const productos = await prisma.producto.findMany({
    where: { id: { in: ids }, tallerId: datos.tallerId, publicadoEnTienda: true, activo: true },
  });

  if (productos.length !== ids.length) {
    throw errores.datosInvalidos('Alguna de las prendas ya no está disponible en ese taller');
  }

  // Los estampados se validan antes de abrir la transacción
  const items = [];
  for (const i of datos.items) {
    const p = productos.find((x) => x.id === i.productoId);
    const estampadoUrl = await guardarEstampado(i.estampado);
    // El precio lo pone el servidor, nunca el cliente.
    const precio = red(dec(p.precioVenta) + (estampadoUrl ? RECARGO_ESTAMPADO : 0));

    items.push({
      productoId: i.productoId,
      cantidad: i.cantidad,
      color: i.color ?? null,
      colorHex: i.colorHex ?? null,
      talla: i.talla ?? null,
      estampadoUrl,
      posicionJson: i.posicionJson ?? null,
      precioUnitario: precio,
    });
  }

  const total = red(items.reduce((a, i) => a + i.precioUnitario * i.cantidad, 0));

  const pedido = await prisma.$transaction(async (tx) => {
    const ultimo = await tx.pedido.findFirst({
      where: { tallerId: datos.tallerId },
      orderBy: { numero: 'desc' },
      select: { numero: true },
    });

    return tx.pedido.create({
      data: {
        tallerId: datos.tallerId,
        clienteId: req.usuario.usuarioId,
        numero: (ultimo?.numero ?? 0) + 1,
        total,
        direccionEntrega: datos.direccionEntrega ?? null,
        telefonoContacto: datos.telefonoContacto ?? null,
        notas: datos.notas ?? null,
        items: { create: items },
      },
      include: { items: { include: { producto: { select: { nombre: true } } } } },
    });
  });

  res.status(201).json({
    id: pedido.id,
    numero: pedido.numero,
    estado: pedido.estado,
    total: dec(pedido.total),
    mensaje:
      'Tu pedido llegó al taller. Te van a contactar por WhatsApp para coordinar la entrega y el pago.',
  });
});

// ── GET /mios — pedidos del cliente ──────────────────────────

rutasPedidos.get('/mios', permitir('CLIENTE'), async (req, res) => {
  const pedidos = await prisma.pedido.findMany({
    where: { clienteId: req.usuario.usuarioId },
    orderBy: { creadoEn: 'desc' },
    include: {
      taller: { select: { nombre: true, telefono: true } },
      items: { include: { producto: { select: { nombre: true } } } },
    },
  });

  res.json({
    pedidos: pedidos.map((p) => ({
      ...p,
      total: dec(p.total),
      items: p.items.map((i) => ({ ...i, precioUnitario: dec(i.precioUnitario) })),
    })),
  });
});

// ── GET / — pedidos que le llegan al taller ──────────────────

rutasPedidos.get('/', conTaller, exigirTaller, async (req, res) => {
  const pedidos = await prisma.pedido.findMany({
    where: scope(req),
    orderBy: { numero: 'desc' },
    include: {
      cliente: { select: { nombre: true, email: true, telefono: true } },
      items: { include: { producto: { select: { nombre: true, sku: true } } } },
      orden: { select: { id: true, numero: true, estado: true } },
    },
  });

  const lista = pedidos.map((p) => ({
    ...p,
    total: dec(p.total),
    items: p.items.map((i) => ({ ...i, precioUnitario: dec(i.precioUnitario) })),
  }));

  res.json({
    pedidos: lista,
    resumen: {
      nuevos: lista.filter((p) => p.estado === 'NUEVO').length,
      enProduccion: lista.filter((p) => p.estado === 'EN_PRODUCCION').length,
      total: lista.length,
    },
  });
});

// ── POST /:id/confirmar — genera la orden de producción ──────

rutasPedidos.post('/:id/confirmar', conTaller, exigirTaller, async (req, res) => {
  const pedido = await prisma.pedido.findFirst({
    where: { id: req.params.id, ...scope(req) },
    include: { items: true, cliente: { select: { nombre: true } } },
  });
  if (!pedido) throw errores.noEncontrado('El pedido');

  if (pedido.estado !== 'NUEVO') {
    throw errores.conflicto(`Este pedido ya fue ${pedido.estado.toLowerCase().replace('_', ' ')}.`);
  }

  // Acá se cierra el circuito: el pedido pasa a ser una orden de
  // producción real, con su costeo y su descuento de inventario.
  const orden = await crearOrden({
    tallerId: req.tallerId,
    clienteNombre: pedido.cliente.nombre,
    notas: `Pedido de la tienda N° ${pedido.numero}`,
    detalles: pedido.items.map((i) => ({
      productoId: i.productoId,
      cantidad: i.cantidad,
      precioUnitarioVenta: dec(i.precioUnitario),
    })),
  });

  await prisma.$transaction([
    prisma.ordenProduccion.update({ where: { id: orden.id }, data: { pedidoId: pedido.id } }),
    prisma.pedido.update({ where: { id: pedido.id }, data: { estado: 'EN_PRODUCCION' } }),
  ]);

  res.json({
    ok: true,
    ordenId: orden.id,
    ordenNumero: orden.numero,
    mensaje: `Se creó la orden de producción N° ${orden.numero}. Arrancala desde Órdenes para descontar el material.`,
  });
});

// ── POST /:id/entregar — registra el ingreso ─────────────────

rutasPedidos.post('/:id/entregar', conTaller, exigirTaller, async (req, res) => {
  const pedido = await prisma.pedido.findFirst({
    where: { id: req.params.id, ...scope(req) },
    include: { items: true, orden: true, cliente: { select: { nombre: true } } },
  });
  if (!pedido) throw errores.noEncontrado('El pedido');

  if (pedido.estado === 'ENTREGADO') throw errores.conflicto('Este pedido ya fue entregado');
  if (pedido.estado === 'CANCELADO') throw errores.conflicto('Este pedido está cancelado');

  const categoria = await prisma.categoria.findFirst({
    where: { tallerId: null, nombre: 'Venta por pedido' },
  });
  if (!categoria) throw errores.datosInvalidos('Falta la categoría "Venta por pedido"');

  const unidades = pedido.items.reduce((a, i) => a + i.cantidad, 0);
  // Si el pedido es de una sola prenda se liga el registro a ese
  // producto: asi la venta cuenta para la rentabilidad por prenda.
  const unicoProducto =
    new Set(pedido.items.map((i) => i.productoId)).size === 1 ? pedido.items[0].productoId : null;

  await prisma.$transaction(async (tx) => {
    await tx.registro.create({
      data: {
        tallerId: req.tallerId,
        fecha: new Date(),
        tipo: 'INGRESO',
        categoriaId: categoria.id,
        descripcion: `Pedido N° ${pedido.numero} — ${pedido.cliente.nombre}`,
        monto: dec(pedido.total),
        origen: 'NEGOCIO',
        productoId: unicoProducto,
        cantidad: unicoProducto ? unidades : null,
        precioUnitario: unicoProducto ? red(dec(pedido.total) / unidades) : null,
        ordenId: pedido.orden?.id ?? null,
        creadoPorId: req.usuario.usuarioId,
      },
    });

    await tx.pedido.update({ where: { id: pedido.id }, data: { estado: 'ENTREGADO' } });

    if (pedido.orden && pedido.orden.estado === 'TERMINADA') {
      await tx.ordenProduccion.update({
        where: { id: pedido.orden.id },
        data: { estado: 'ENTREGADA' },
      });
    }
  });

  res.json({
    ok: true,
    mensaje: `Se registró el ingreso de ${dec(pedido.total).toFixed(2)} Bs. por el pedido N° ${pedido.numero}.`,
  });
});

// ── POST /:id/cancelar ───────────────────────────────────────

rutasPedidos.post('/:id/cancelar', conTaller, exigirTaller, async (req, res) => {
  const pedido = await prisma.pedido.findFirst({
    where: { id: req.params.id, ...scope(req) },
  });
  if (!pedido) throw errores.noEncontrado('El pedido');
  if (pedido.estado === 'ENTREGADO') {
    throw errores.conflicto('No se puede cancelar un pedido ya entregado');
  }

  await prisma.pedido.update({ where: { id: pedido.id }, data: { estado: 'CANCELADO' } });
  res.json({ ok: true });
});
