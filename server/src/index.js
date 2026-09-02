// ============================================================
// ARRANQUE DEL SERVIDOR
// ============================================================

import { app } from './app.js';
import { env } from './lib/env.js';
import { prisma } from './lib/prisma.js';

const servidor = app.listen(env.puerto, () => {
  console.log(`
  API de Gestione escuchando
  http://localhost:${env.puerto}
  entorno: ${env.esProduccion ? 'produccion' : 'desarrollo'}
  origenes permitidos: ${env.corsOrigenes.join(', ')}
`);
});

// Cierre ordenado: Render manda SIGTERM al dormir el servicio y
// conviene devolver las conexiones de Neon antes de morir.
const apagar = async (senal) => {
  console.log(`\n${senal} recibido, cerrando...`);
  servidor.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGTERM', () => apagar('SIGTERM'));
process.on('SIGINT', () => apagar('SIGINT'));
