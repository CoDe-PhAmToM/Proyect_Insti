// ============================================================
// RUTAS: CONFIGURACION DEL TALLER
// Datos del taller y su QR de cobro.
// ============================================================

import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { autenticar } from '../middleware/auth.js';
import { conTaller, exigirTaller, bloquearAyudante } from '../middleware/tenancy.js';
import { validar } from './materiales.js';
import { guardarEstampado } from '../services/imagenes.js';

export const rutasTaller = Router();

rutasTaller.use(autenticar, conTaller, exigirTaller);

rutasTaller.get('/', async (req, res) => {
  const taller = await prisma.taller.findUnique({
    where: { id: req.tallerId },
    select: {
      id: true, nombre: true, distrito: true, direccion: true, telefono: true,
      qrUrl: true, qrTitular: true, qrBanco: true, enPiloto: true,
    },
  });

  res.json({
    ...taller,
    hayQr: Boolean(taller.qrUrl),
    aviso: taller.qrUrl
      ? null
      : 'Cargá tu QR de cobro para que tus clientes puedan pagarte desde la tienda.',
  });
});

const esquema = z.object({
  nombre: z.string().min(2).max(120).trim().optional(),
  direccion: z.string().max(200).trim().nullish(),
  telefono: z.string().max(30).trim().nullish(),
  qrTitular: z.string().max(120).trim().nullish(),
  qrBanco: z.string().max(60).trim().nullish(),
});

rutasTaller.patch('/', bloquearAyudante, async (req, res) => {
  const datos = validar(esquema, req.body);

  const taller = await prisma.taller.update({
    where: { id: req.tallerId },
    data: datos,
    select: { nombre: true, direccion: true, telefono: true, qrTitular: true, qrBanco: true },
  });

  res.json(taller);
});

// ── PUT /qr — subir la imagen del QR ─────────────────────────
// Se guarda igual que los estampados: reducida por el navegador y
// como data URL en la base. El cambio a un almacenamiento externo
// toca un solo archivo, services/imagenes.js.

rutasTaller.put('/qr', bloquearAyudante, async (req, res) => {
  const url = await guardarEstampado(req.body?.qr);

  const taller = await prisma.taller.update({
    where: { id: req.tallerId },
    data: {
      qrUrl: url,
      qrTitular: req.body?.titular?.slice(0, 120) ?? undefined,
      qrBanco: req.body?.banco?.slice(0, 60) ?? undefined,
    },
    select: { qrUrl: true, qrTitular: true, qrBanco: true },
  });

  res.json({
    ...taller,
    mensaje: url
      ? 'Tu QR quedó cargado. Tus clientes lo van a ver al cerrar el pedido.'
      : 'Se quitó el QR. Los pedidos se van a coordinar por WhatsApp.',
  });
});
