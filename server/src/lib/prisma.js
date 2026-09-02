// ============================================================
// CLIENTE PRISMA
// Una sola instancia para todo el proceso. Con --watch en
// desarrollo el modulo se recarga, y sin este singleton se abriria
// una conexion nueva en cada recarga hasta agotar el pool de Neon.
// ============================================================

import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

const globalRef = globalThis;

export const prisma =
  globalRef.__prisma ??
  new PrismaClient({
    log: env.esProduccion ? ['error'] : ['warn', 'error'],
  });

if (!env.esProduccion) globalRef.__prisma = prisma;
