# Despliegue a producción

Todo en capa gratuita. Tres servicios, una vez.

---

## Antes de empezar

**Cambiar la contraseña de prueba.** Los usuarios semilla usan `gestione2026`.
Antes de que entre un microempresario real:

```bash
SEED_PASSWORD="una-clave-larga-y-distinta" npm run db:seed
```

**Generar secretos nuevos.** Los de desarrollo no van a producción:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## 1. Base de datos — Neon

Ya está creada. Para producción conviene un branch aparte del de desarrollo, así
las pruebas no ensucian los datos del piloto.

⚠️ **No usar Render Postgres.** Su plan gratuito expira a los 90 días y borra la
base. Con un piloto de varios meses, se perderían los datos a mitad de camino.

---

## 2. API — Render

1. **New → Web Service**, conectar el repositorio de GitHub
2. Configuración:

| Campo | Valor |
|---|---|
| Root Directory | `server` |
| Build Command | `npm install && npx prisma generate && npx prisma migrate deploy` |
| Start Command | `npm start` |
| Instance Type | Free |

3. Variables de entorno:

```
DATABASE_URL          la cadena de Neon
JWT_ACCESS_SECRET     el primer secreto generado
JWT_REFRESH_SECRET    el segundo, distinto
NODE_ENV              production
CORS_ORIGIN           https://tu-app.vercel.app
```

No definir `PORT`: Render lo inyecta solo.

### El servidor se duerme

El plan gratuito duerme el servicio tras 15 minutos sin tráfico, y la primera
petición tarda 30–50 segundos. Dos cosas lo mitigan:

- El cliente muestra "Abriendo tu taller… puede tardar unos segundos", en vez de
  parecer colgado.
- Un ping cada 14 minutos a `/health` desde **cron-job.org** (gratis).

**Para la defensa: entrar 5 minutos antes** y dejar la pestaña abierta.

---

## 3. Frontend — Vercel

1. **Add New → Project**, importar el repositorio

| Campo | Valor |
|---|---|
| Root Directory | `client` |
| Framework | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |

2. Variable de entorno:

```
VITE_API_URL   https://tu-api.onrender.com/api/v1
```

3. Volver a Render y poner ese dominio de Vercel en `CORS_ORIGIN`.

---

## 4. Respaldos

El plan gratuito de Neon **no hace respaldos automáticos**. Con datos
financieros reales de personas, eso es un riesgo que no se puede dejar así.

Una vez por semana, desde la máquina del equipo:

```bash
pg_dump "$DATABASE_URL" > respaldo-$(date +%Y-%m-%d).sql
```

Guardar el archivo fuera de Neon: Drive, un pendrive, donde sea. Si la base se
pierde, se pierde el piloto entero y con él el capítulo de resultados.

---

## 5. Antes de que entre el primer microempresario

- [ ] Contraseñas de prueba cambiadas
- [ ] Secretos JWT nuevos, distintos de los de desarrollo
- [ ] `CORS_ORIGIN` apuntando solo al dominio de Vercel
- [ ] Ping a `/health` configurado
- [ ] Primer respaldo hecho y guardado
- [ ] **Consentimiento informado firmado** por cada participante
- [ ] Línea base cargada desde su cuaderno, antes de que empiece a usar el sistema

> El último punto es el que más se olvida y el que no tiene arreglo después: sin
> línea base no hay con qué comparar, y el objetivo específico 5 queda sin datos.

---

## Datos personales

El piloto maneja información financiera de personas identificables.

- Las contraseñas se guardan hasheadas con bcrypt, nunca en texto plano.
- La exportación para el análisis sale **anonimizada**: los talleres aparecen
  como T01, T02, T03.
- El aislamiento entre talleres tiene 12 pruebas automáticas que se corren en
  cada cambio.
- Los respaldos contienen datos reales: guardarlos con el mismo cuidado que los
  cuadernos originales.
