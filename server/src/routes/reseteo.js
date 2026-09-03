// ============================================================
// RUTAS: RECUPERAR CONTRASENA
//
// Sin esto, una microempresaria que olvida su clave queda afuera
// del sistema y del piloto. Con una muestra de 3 a 15 talleres,
// perder uno asi es perder entre el 7 % y el 33 % de la muestra.
//
// Por que NO se manda por correo: buena parte de la poblacion del
// estudio no tiene un correo activo, y el que puso al registrarse
// puede ser de un familiar o no revisarse nunca. Mandar un enlace
// ahi es mandar el pedido de ayuda a un buzon vacio.
//
// Como funciona: la persona llama o escribe al equipo, el equipo
// emite un codigo de 6 digitos que dura 30 minutos y se lo dicta
// por telefono. Con ese codigo pone su clave nueva.
//
// El codigo se guarda HASHEADO: si alguien lee la base, no puede
// tomar cuentas.
// ============================================================

import { Router } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { errores } from '../lib/errores.js';
import { autenticar, permitir } from '../middleware/auth.js';
import { validar } from './materiales.js';
import { revocarTodasLasSesiones } from '../lib/tokens.js';

export const rutasReseteo = Router();

const MINUTOS_VIGENCIA = 30;

const hashear = (c) => crypto.createHash('sha256').update(c).digest('hex');

// Seis digitos: se dicta bien por telefono y se escribe rapido en
// un celular. El espacio de 900.000 combinaciones alcanza porque
// dura 30 minutos y el intento esta limitado.
const generarCodigo = () => String(crypto.randomInt(100000, 999999));

// ── POST /emitir — solo el equipo investigador ───────────────

rutasReseteo.post('/emitir', autenticar, permitir('ADMIN'), async (req, res) => {
  const { email } = validar(z.object({ email: z.string().email().toLowerCase().trim() }), req.body);

  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario) throw errores.noEncontrado('Esa cuenta');

  const codigo = generarCodigo();
  const expiraEn = new Date(Date.now() + MINUTOS_VIGENCIA * 60 * 1000);

  await prisma.$transaction([
    // Se anulan los codigos anteriores sin usar: solo uno vigente
    // por persona, o dos llamadas seguidas dejarian dos puertas.
    prisma.codigoReseteo.updateMany({
      where: { usuarioId: usuario.id, usadoEn: null },
      data: { usadoEn: new Date() },
    }),
    prisma.codigoReseteo.create({
      data: {
        usuarioId: usuario.id,
        codigoHash: hashear(codigo),
        expiraEn,
        emitidoPor: req.usuario.usuarioId,
      },
    }),
  ]);

  res.json({
    codigo,
    para: { nombre: usuario.nombre, email: usuario.email, telefono: usuario.telefono },
    venceEn: expiraEn,
    mensaje: `Dictale este código a ${usuario.nombre}. Vence en ${MINUTOS_VIGENCIA} minutos y sirve una sola vez.`,
  });
});

// ── POST /usar — publico, con freno ──────────────────────────

const limitarCanjes = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Esperá unos minutos.' },
});

const esquemaUso = z.object({
  email: z.string().email('Ese correo no parece válido').toLowerCase().trim(),
  codigo: z.string().regex(/^\d{6}$/, 'El código son 6 números'),
  password: z.string().min(8, 'La contraseña necesita al menos 8 caracteres'),
});

rutasReseteo.post('/usar', limitarCanjes, async (req, res) => {
  const datos = validar(esquemaUso, req.body);

  const usuario = await prisma.usuario.findUnique({ where: { email: datos.email } });

  const registro = usuario
    ? await prisma.codigoReseteo.findFirst({
        where: {
          usuarioId: usuario.id,
          codigoHash: hashear(datos.codigo),
          usadoEn: null,
          expiraEn: { gt: new Date() },
        },
      })
    : null;

  // Mismo mensaje si el correo no existe, si el codigo esta mal o
  // si vencio: no se le dice a nadie cual de las tres cosas fue.
  if (!registro) {
    throw errores.datosInvalidos(
      'El código no es válido o ya venció. Pedí uno nuevo al equipo.'
    );
  }

  await prisma.$transaction([
    prisma.usuario.update({
      where: { id: usuario.id },
      data: { passwordHash: await bcrypt.hash(datos.password, 12) },
    }),
    prisma.codigoReseteo.update({
      where: { id: registro.id },
      data: { usadoEn: new Date() },
    }),
  ]);

  // Cambiar la clave cierra todas las sesiones abiertas: si alguien
  // habia entrado con la clave vieja, queda afuera.
  await revocarTodasLasSesiones(usuario.id);

  res.json({ ok: true, mensaje: 'Listo. Ya podés entrar con tu contraseña nueva.' });
});
