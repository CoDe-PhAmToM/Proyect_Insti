# Despliegue a producción

Tres servicios, todos en capa gratuita. Una sola vez.

> ⚠️ **Lo más importante de este documento**
>
> Este es un **monorepo con npm workspaces**. El paquete `shared/` — donde viven
> las fórmulas de costeo — se resuelve por un enlace en el `node_modules` de la
> **raíz**, no dentro de `server/` ni de `client/`.
>
> Si en Render o Vercel ponés el *Root Directory* en `server` o `client`, la
> instalación no va a encontrar `shared` y el despliegue **falla al arrancar**
> con `Cannot find package 'shared'`.
>
> **Dejá el Root Directory vacío en los dos.** Las configuraciones de abajo ya
> están así.

---

## Antes de empezar

**1. Cambiar la contraseña de prueba.** Los usuarios semilla usan `gestione2026`.

```bash
SEED_PASSWORD="una-clave-larga-y-distinta" npm run db:seed
```

**2. Generar dos secretos nuevos.** Los de desarrollo no van a producción. Corré
esto dos veces y guardá los dos resultados:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**3. Decidir desde qué rama.** Hoy el trabajo está en `sprint-1-backend`. Lo
normal es fusionar a `main` y desplegar desde ahí:

```bash
git checkout main && git merge sprint-1-backend && git push
```

---

## 1. Base de datos — Neon

Ya está creada y migrada. Para producción conviene un *branch* aparte del de
desarrollo, así las pruebas no ensucian los datos del piloto.

⚠️ **No usar Render Postgres.** Su plan gratuito expira a los 90 días y borra la
base. Con un piloto de varios meses, se perderían los datos a mitad de camino.

---

## 2. API — Render

**New → Web Service**, conectar el repositorio de GitHub.

| Campo | Valor |
|---|---|
| Root Directory | **(vacío)** ← no poner `server` |
| Runtime | Node |
| Build Command | `npm install && npm run db:deploy --workspace=server` |
| Start Command | `npm run start --workspace=server` |
| Instance Type | Free |

El `npm install` desde la raíz instala los tres workspaces y crea el enlace a
`shared`. El `postinstall` de `server` corre `prisma generate` solo, y
`db:deploy` aplica las migraciones pendientes en cada despliegue.

**Variables de entorno:**

```
DATABASE_URL          la cadena de Neon
JWT_ACCESS_SECRET     el primer secreto generado
JWT_REFRESH_SECRET    el segundo, distinto
NODE_ENV              production
CORS_ORIGIN           https://tu-app.vercel.app
```

No definir `PORT`: Render lo inyecta solo, y el código lo respeta.

`CORS_ORIGIN` todavía no lo sabés — poné cualquier cosa ahora y volvé a
corregirlo después del paso 3.

### El servidor se duerme

El plan gratuito duerme el servicio tras 15 minutos sin tráfico, y la primera
petición tarda 30–50 segundos. Dos cosas lo mitigan:

- El cliente ya muestra *"Abriendo tu taller… puede tardar unos segundos"* en vez
  de parecer colgado.
- Un ping cada 14 minutos a `/health` desde **cron-job.org** (gratis).

**Para la defensa: entrar 5 minutos antes** y dejar la pestaña abierta.

---

## 3. Frontend — Vercel

**Add New → Project**, importar el mismo repositorio.

| Campo | Valor |
|---|---|
| Root Directory | **(vacío)** ← no poner `client` |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `client/dist` |
| Install Command | `npm install` |

**Variable de entorno:**

```
VITE_API_URL   https://tu-api.onrender.com/api/v1
```

Ojo con el `/api/v1` del final: sin eso, ninguna petición encuentra las rutas.

### Volver a Render

Copiá el dominio que te dio Vercel y ponelo en `CORS_ORIGIN` de Render. Sin eso,
el navegador bloquea todas las peticiones y la app se ve pero no carga nada.

---

## 4. Respaldos

Ya está el workflow en `.github/workflows/respaldo.yml`, que corre los domingos.
Solo falta cargarle el secreto:

**Settings → Secrets and variables → Actions → New repository secret**

```
Nombre:  DATABASE_URL
Valor:   la misma cadena de Neon
```

Se puede disparar a mano desde la pestaña **Actions** para comprobar que anda.

⚠️ Neon gratuito **no respalda solo**. Sin esto, si la base se pierde, se pierde
el piloto entero y con él el capítulo de resultados.

---

## 5. Verificación después de desplegar

```bash
# 1. La API responde y ve la base
curl https://tu-api.onrender.com/health

# 2. El login funciona
curl -X POST https://tu-api.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"maria@taller.bo","password":"TU-CLAVE-NUEVA"}'
```

Después, desde el navegador: entrar, anotar un movimiento, recargar la página y
ver que sigue ahí.

---

## 6. Antes de que entre el primer microempresario

- [ ] Contraseñas de prueba cambiadas
- [ ] Secretos JWT nuevos, distintos de los de desarrollo
- [ ] `CORS_ORIGIN` apuntando solo al dominio de Vercel
- [ ] Ping a `/health` configurado en cron-job.org
- [ ] Secreto `DATABASE_URL` cargado en GitHub Actions
- [ ] Primer respaldo disparado a mano y descargado
- [ ] **Consentimiento informado firmado** por cada participante
- [ ] **Línea base cargada** desde su cuaderno, ANTES de que empiece a usar el sistema

> El último punto es el que más se olvida y el único que **no tiene arreglo
> después**: sin línea base no hay contra qué comparar, y ese taller queda fuera
> del objetivo específico 5.

---

## Para la defensa

El sistema en producción arranca vacío, que es lo correcto para el piloto. Pero
si van a mostrarlo ante el tribunal, conviene tener un taller con historia:

```bash
npm run db:demo
```

Genera 6 meses de movimientos verosímiles en el Taller Mamani: el gráfico toma
forma, el pronóstico se emite, el comparativo muestra evolución.

**Correrlo contra la base de desarrollo, no contra la del piloto.** Los datos de
los talleres reales no se mezclan con datos generados.

---

## Datos personales

El piloto maneja información financiera de personas identificables.

- Las contraseñas se guardan hasheadas con bcrypt, nunca en texto plano.
- La exportación para el análisis sale **anonimizada**: T01, T02, T03.
- El aislamiento entre talleres tiene 12 pruebas automáticas.
- Los respaldos contienen datos reales: guardarlos con el mismo cuidado que los
  cuadernos originales.

---

## Si algo falla

| Síntoma | Causa casi siempre |
|---|---|
| `Cannot find package 'shared'` | Root Directory mal puesto. Dejalo **vacío**. |
| La app carga pero no trae datos | `CORS_ORIGIN` no coincide con el dominio de Vercel |
| Todas las peticiones dan 404 | Falta `/api/v1` al final de `VITE_API_URL` |
| `P1001: Can't reach database` | La cadena de Neon necesita `?sslmode=require` |
| Primera carga del día tarda 40 s | Normal: Render despertando. Configurá el ping. |
| No arranca y dice que falta una variable | Es a propósito: el servidor no levanta a medias |
