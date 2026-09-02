// ============================================================
// APLICACION EXPRESS
// Arma la cadena de middlewares y monta las rutas.
// Express 5 captura solo los errores de funciones async, asi que
// los handlers pueden lanzar sin envoltorios.
// ============================================================

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';

import { env } from './lib/env.js';
import { prisma } from './lib/prisma.js';
import { rutasAuth } from './routes/auth.js';
import { rutasMateriales } from './routes/materiales.js';
import { rutasProductos } from './routes/productos.js';
import { rutasRegistros } from './routes/registros.js';
import { rutasCostosFijos } from './routes/costosFijos.js';
import { rutasCategorias } from './routes/categorias.js';
import { noEncontrado, manejadorErrores } from './middleware/errores.js';

export const app = express();

// Detras de Render hay un proxy: sin esto el limitador de intentos
// veria una sola IP para todo el mundo.
app.set('trust proxy', 1);

app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: env.corsOrigenes,
    credentials: true, // necesario para que viaje la cookie de refresh
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// ── Salud ────────────────────────────────────────────────────
// Lo consulta el ping que evita que Render duerma el servidor.
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, baseDatos: 'conectada', hora: new Date().toISOString() });
  } catch {
    res.status(503).json({ ok: false, baseDatos: 'sin conexion' });
  }
});

// ── Rutas ────────────────────────────────────────────────────
app.use('/api/v1/auth', rutasAuth);
app.use('/api/v1/materiales', rutasMateriales);
app.use('/api/v1/productos', rutasProductos);
app.use('/api/v1/registros', rutasRegistros);
app.use('/api/v1/costos-fijos', rutasCostosFijos);
app.use('/api/v1/categorias', rutasCategorias);

// ── Cierre ───────────────────────────────────────────────────
app.use(noEncontrado);
app.use(manejadorErrores);
