// ============================================================
// CONFIGURACION
// Valida las variables de entorno al arrancar y falla de entrada
// con un mensaje claro. Es preferible que el servidor no levante
// a que levante a medias y falle recien cuando alguien se loguea.
// ============================================================

import 'dotenv/config';

const requeridas = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

const faltantes = requeridas.filter((k) => !process.env[k]?.trim());

if (faltantes.length > 0) {
  console.error(`
No se puede arrancar el servidor: faltan variables en server/.env

  ${faltantes.join('\n  ')}

Copia server/.env.example a server/.env y completalo.
Para generar los secretos:
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
`);
  process.exit(1);
}

const esProduccion = process.env.NODE_ENV === 'production';

// En produccion los secretos por defecto son un agujero de seguridad,
// no una molestia: mejor no arrancar.
if (esProduccion) {
  for (const k of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
    if (process.env[k].includes('cambiar-por')) {
      console.error(`No se puede arrancar en produccion con el valor de ejemplo en ${k}.`);
      process.exit(1);
    }
  }
}

export const env = {
  esProduccion,
  puerto: Number(process.env.PORT ?? 4000),
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessTtl: process.env.ACCESS_TOKEN_TTL ?? '15m',
    refreshTtlDias: Number(process.env.REFRESH_TOKEN_TTL_DIAS ?? 7),
  },
  // Acepta varios origenes separados por coma (local + Vercel)
  corsOrigenes: (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};
