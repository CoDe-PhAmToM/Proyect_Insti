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
import rateLimit from 'express-rate-limit';

import { env } from './lib/env.js';
import { prisma } from './lib/prisma.js';
import { rutasAuth } from './routes/auth.js';
import { rutasMateriales } from './routes/materiales.js';
import { rutasProductos } from './routes/productos.js';
import { rutasRegistros } from './routes/registros.js';
import { rutasCostosFijos } from './routes/costosFijos.js';
import { rutasCategorias } from './routes/categorias.js';
import { rutasOrdenes } from './routes/ordenes.js';
import { rutasIndicadores } from './routes/indicadores.js';
import { rutasReportes } from './routes/reportes.js';
import { rutasRecomendaciones } from './routes/recomendaciones.js';
import { rutasTienda, rutasPedidos } from './routes/tienda.js';
import { rutasMiembros } from './routes/miembros.js';
import { rutasReseteo } from './routes/reseteo.js';
import { rutasSus } from './routes/sus.js';
import { rutasTaller } from './routes/taller.js';
import { rutasPlantillas } from './routes/plantillas.js';
import { rutasErrores } from './routes/errores.js';
import { rutasEventos, rutasLineaBase, rutasAdmin } from './routes/medicion.js';
import { noEncontrado, manejadorErrores } from './middleware/errores.js';

export const app = express();

// Detras de Render hay un proxy: sin esto el limitador de intentos
// veria una sola IP para todo el mundo.
app.set('trust proxy', 1);

app.use(
  helmet({
    // La API no sirve HTML, asi que la politica de contenido no
    // aplica; el frontend vive en otro dominio.
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Freno general contra abuso. Es holgado a proposito: un taller
// cargando movimientos hace decenas de peticiones por minuto, y
// frenar a un usuario legitimo es peor que el abuso que evita.
app.use(
  '/api/',
  rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas peticiones. Espera un momento.' },
  })
);
app.use(compression());
app.use(
  cors({
    origin: env.corsOrigenes,
    credentials: true, // necesario para que viaje la cookie de refresh
  })
);
app.use(express.json({ limit: '4mb' })); // los estampados viajan en base64
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
app.use('/api/v1/ordenes', rutasOrdenes);
app.use('/api/v1/indicadores', rutasIndicadores);
app.use('/api/v1/reportes', rutasReportes);
app.use('/api/v1/recomendaciones', rutasRecomendaciones);
app.use('/api/v1/tienda', rutasTienda);
app.use('/api/v1/pedidos', rutasPedidos);
app.use('/api/v1/miembros', rutasMiembros);
app.use('/api/v1/reseteo', rutasReseteo);
app.use('/api/v1/sus', rutasSus);
app.use('/api/v1/taller', rutasTaller);
app.use('/api/v1/plantillas', rutasPlantillas);
app.use('/api/v1/errores', rutasErrores);
app.use('/api/v1/eventos', rutasEventos);
app.use('/api/v1/linea-base', rutasLineaBase);
app.use('/api/v1/admin', rutasAdmin);

// ── Cierre ───────────────────────────────────────────────────
app.use(noEncontrado);
app.use(manejadorErrores);
