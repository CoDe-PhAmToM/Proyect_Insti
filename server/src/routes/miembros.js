// ============================================================
// RUTAS: MIEMBROS DEL TALLER
//
// El rol AYUDANTE existia, funcionaba y estaba probado — pero no
// habia forma de dar de alta a una persona desde la interfaz. Habia
// que insertar la fila a mano en la base.
//
// Eso importa mas de lo que parece: el documento nombra como
// problema la "dependencia absoluta de la memoria del dueno,
// imposibilitando delegar". Si en el piloto ningun taller puede
// usar el rol, esa parte de la hipotesis queda sin evidencia.
//
// El dueno crea la cuenta del ayudante y le dicta la clave. No se
// manda por correo: muchos no tienen uno activo.
// ============================================================

import { Router } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { errores } from '../lib/errores.js';
import { autenticar } from '../middleware/auth.js';
import { conTaller, exigirTaller, scope, bloquearAyudante } from '../middleware/tenancy.js';
import { validar } from './materiales.js';
import { revocarTodasLasSesiones } from '../lib/tokens.js';

export const rutasMiembros = Router();

rutasMiembros.use(autenticar, conTaller, exigirTaller, bloquearAyudante);

const esquemaMiembro = z.object({
  nombre: z.string().min(2, 'Escribí el nombre de la persona').max(120).trim(),
  email: z.string().email('Ese correo no parece válido').toLowerCase().trim(),
  telefono: z.string().max(30).trim().nullish(),
  rolEnTaller: z.enum(['AYUDANTE', 'PRODUCTOR']).default('AYUDANTE'),
});

/**
 * Clave inicial legible: dos palabras y tres numeros.
 *
 * Nada de cadenas aleatorias: el dueno se la va a dictar en voz
 * alta a alguien que la va a escribir en un celular. "tela-hilo-472"
 * se dicta; "xK9#mP2q" no.
 */
const clavePronunciable = () => {
  const palabras = [
    'tela', 'hilo', 'aguja', 'corte', 'tijera', 'boton', 'cierre',
    'costura', 'molde', 'lana', 'seda', 'punto',
  ];
  const azar = (n) => crypto.randomInt(0, n);
  return `${palabras[azar(palabras.length)]}-${palabras[azar(palabras.length)]}-${crypto.randomInt(100, 999)}`;
};

// ── GET / ────────────────────────────────────────────────────

rutasMiembros.get('/', async (req, res) => {
  const miembros = await prisma.usuarioTaller.findMany({
    where: scope(req),
    include: {
      usuario: {
        select: { id: true, nombre: true, email: true, telefono: true, activo: true, ultimoAcceso: true },
      },
    },
    orderBy: { creadoEn: 'asc' },
  });

  const taller = await prisma.taller.findUnique({
    where: { id: req.tallerId },
    select: { propietarioId: true },
  });

  res.json({
    miembros: miembros.map((m) => ({
      id: m.id,
      rolEnTaller: m.rolEnTaller,
      esDueno: m.usuarioId === taller.propietarioId,
      ...m.usuario,
    })),
  });
});

// ── POST / ───────────────────────────────────────────────────

rutasMiembros.post('/', async (req, res) => {
  const datos = validar(esquemaMiembro, req.body);

  const yaExiste = await prisma.usuario.findUnique({ where: { email: datos.email } });
  if (yaExiste) {
    // Si la persona ya tiene cuenta, se la suma al taller en vez de
    // rechazar: puede ser un ayudante que trabaja en dos talleres.
    const yaMiembro = await prisma.usuarioTaller.findUnique({
      where: { usuarioId_tallerId: { usuarioId: yaExiste.id, tallerId: req.tallerId } },
    });
    if (yaMiembro) throw errores.conflicto('Esa persona ya es parte de tu taller');

    await prisma.usuarioTaller.create({
      data: { usuarioId: yaExiste.id, tallerId: req.tallerId, rolEnTaller: datos.rolEnTaller },
    });

    return res.status(201).json({
      id: yaExiste.id,
      nombre: yaExiste.nombre,
      email: yaExiste.email,
      claveInicial: null,
      mensaje: `${yaExiste.nombre} ya tenía cuenta, así que la sumamos a tu taller. Entra con la contraseña que ya usaba.`,
    });
  }

  const clave = clavePronunciable();
  const passwordHash = await bcrypt.hash(clave, 12);

  const usuario = await prisma.$transaction(async (tx) => {
    const u = await tx.usuario.create({
      data: {
        email: datos.email,
        passwordHash,
        nombre: datos.nombre,
        telefono: datos.telefono ?? null,
        rol: datos.rolEnTaller,
      },
    });
    await tx.usuarioTaller.create({
      data: { usuarioId: u.id, tallerId: req.tallerId, rolEnTaller: datos.rolEnTaller },
    });
    return u;
  });

  res.status(201).json({
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    // Se devuelve UNA sola vez: no queda guardada en ningun lado
    // legible, solo hasheada.
    claveInicial: clave,
    mensaje: `Anotá esta contraseña y dásela a ${usuario.nombre}. No la vas a poder volver a ver.`,
  });
});

// ── PATCH /:id — activar o desactivar ────────────────────────

rutasMiembros.patch('/:id', async (req, res) => {
  const membresia = await prisma.usuarioTaller.findFirst({
    where: { id: req.params.id, ...scope(req) },
    include: { usuario: true },
  });
  if (!membresia) throw errores.noEncontrado('Ese miembro');

  const taller = await prisma.taller.findUnique({
    where: { id: req.tallerId },
    select: { propietarioId: true },
  });
  if (membresia.usuarioId === taller.propietarioId) {
    throw errores.datosInvalidos('No podés desactivarte a vos mismo');
  }

  const activo = req.body?.activo !== false;

  await prisma.usuario.update({ where: { id: membresia.usuarioId }, data: { activo } });
  // Al desactivar se cortan sus sesiones abiertas: si no, seguiria
  // entrando hasta que venza el token.
  if (!activo) await revocarTodasLasSesiones(membresia.usuarioId);

  res.json({ ok: true, activo });
});

// ── DELETE /:id — sacar del taller ───────────────────────────

rutasMiembros.delete('/:id', async (req, res) => {
  const membresia = await prisma.usuarioTaller.findFirst({
    where: { id: req.params.id, ...scope(req) },
  });
  if (!membresia) throw errores.noEncontrado('Ese miembro');

  const taller = await prisma.taller.findUnique({
    where: { id: req.tallerId },
    select: { propietarioId: true },
  });
  if (membresia.usuarioId === taller.propietarioId) {
    throw errores.datosInvalidos('El dueño del taller no se puede quitar');
  }

  // Se quita la membresia, no la cuenta: sus registros historicos
  // siguen apuntando a esa persona y borrarla los dejaria huerfanos.
  await prisma.usuarioTaller.delete({ where: { id: membresia.id } });
  await revocarTodasLasSesiones(membresia.usuarioId);

  res.json({ ok: true });
});

// ── POST /:id/nueva-clave ────────────────────────────────────
// El dueno le puede resetear la clave a su ayudante directamente.

rutasMiembros.post('/:id/nueva-clave', async (req, res) => {
  const membresia = await prisma.usuarioTaller.findFirst({
    where: { id: req.params.id, ...scope(req) },
    include: { usuario: { select: { nombre: true } } },
  });
  if (!membresia) throw errores.noEncontrado('Ese miembro');

  const clave = clavePronunciable();
  await prisma.usuario.update({
    where: { id: membresia.usuarioId },
    data: { passwordHash: await bcrypt.hash(clave, 12) },
  });
  await revocarTodasLasSesiones(membresia.usuarioId);

  res.json({
    claveInicial: clave,
    mensaje: `Nueva contraseña para ${membresia.usuario.nombre}. Anotala: no se puede volver a ver.`,
  });
});
