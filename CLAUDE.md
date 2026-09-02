# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install              # instala los 3 workspaces
npm run dev              # API (4000) + web (3000) en paralelo
npm run dev:api          # solo el servidor
npm run dev:web          # solo el frontend
npm run build            # build de producción del cliente
npm test                 # pruebas del servidor (node:test)
```

Base de datos (se ejecutan desde la raíz, delegan al workspace `server`):

```bash
npm run db:migrate       # crea/aplica migración en desarrollo
npm run db:seed          # carga datos semilla
npm run db:studio        # explorador visual de la base
npm run db:reset         # DESTRUCTIVO: borra y recrea la base
```

Una sola prueba: `cd server && node --test test/costeo.test.js`

No hay linter ni formateador configurado. No inventar comandos para ellos.

## Qué es esto

Plataforma de gestión financiera para microempresas de confección informal del Distrito 6, El Alto
(Bolivia). Es el sistema de una tesis conjunta de **Ingeniería de Sistemas + Contaduría Pública**, y
va a producción para un piloto con talleres reales.

Todo el vocabulario, los identificadores, los comentarios y la interfaz están en **español**, registro
boliviano con voseo ("Producí", "vendés", "Marcá"). Mantenerlo así: fue una decisión deliberada para
acercar la herramienta al usuario. Moneda en bolivianos, formato `Bs. 1,234.56`.

`docs/requisitos.md` resume qué exige el documento de tesis. Es la fuente de verdad sobre features.

## Arquitectura

Monorepo con **npm workspaces**: `client/`, `server/`, `shared/`.

```
client/    React 19 + Vite + Tailwind v4   → Vercel
server/    Node 20 + Express 5 + Prisma    → Render
shared/    fórmulas puras, sin dependencias → importado por ambos
           PostgreSQL                       → Neon
```

### `shared/` existe por una razón concreta

Las fórmulas financieras tienen que ser **idénticas** en el cliente (vista previa instantánea al mover
el margen) y en el servidor (cálculo autoritativo que se persiste). Duplicarlas garantizaría que se
desincronicen. Si tocás una fórmula de costeo, va acá y en ningún otro lado.

- `shared/costeo.js` — costo unitario, margen de contribución, punto de equilibrio, resultado del período
- `shared/validacion.js` — reglas de validación (el cliente valida para dar feedback, el servidor
  revalida porque nunca confía en el cliente; mismo mensaje en ambos lados)
- `shared/formato.js` — moneda, fechas, porcentajes

### Multi-taller

Casi toda tabla de negocio cuelga de `tallerId`. El middleware de tenancy fuerza ese filtro en cada
consulta: **un productor nunca puede leer datos de otro taller**, ni manipulando ids en la petición.
Cualquier endpoint nuevo pasa por ese middleware. Hay una prueba de aislamiento que debe correr en
cada sprint.

### Roles

`ADMIN` (equipo investigador: métricas agregadas y exportación del piloto) · `PRODUCTOR` (dueño) ·
`AYUDANTE` (registra movimientos, **no ve márgenes ni costos**) · `CLIENTE` (tienda).

El rol `AYUDANTE` no es relleno: el documento nombra como problema la *"dependencia absoluta de la
memoria del dueño, imposibilitando delegar"*. Poder delegar el registro sin exponer los márgenes
responde directamente a eso.

`ADMIN` es requisito de la tesis, no un lujo: es la única forma de extraer datos de los talleres del
piloto para el análisis estadístico del capítulo de resultados.

## Decisiones que no son obvias leyendo el código

- **`Registro.tipo` tiene tres valores: `INGRESO`, `EGRESO`, `RETIRO`.** El documento mide
  `ingresos − egresos − retiros`: el retiro del dueño es un tercer tipo, no un egreso más.
- **Los campos de `Registro` calcan el cuaderno de papel**: `fecha, producto (prenda), cantidad,
  precioUnitario`. Un indicador de la tesis mide justamente el % de campos que coinciden con lo que el
  microempresario ya anota a mano. Cualquier campo nuevo debe parecerse a eso, no a un plan de cuentas.
- **`MovimientoMaterial` es el Kardex.** El costo unitario se congela al momento del consumo, no se
  recalcula con el precio de hoy. Es lo contablemente correcto y lo que hace que el Kardex cuadre.
- **`OrdenCosto` es costeo por órdenes**, no costeo estándar por producto: acumula los costos
  *realmente* incurridos en una orden concreta. Es el objetivo específico 3 de la tesis.
- **`CostoFijo` es indispensable**: sin esa tabla no existe el punto de equilibrio.
- **El CIF se prorratea desde los egresos ya registrados** (`cifUnitario`), no se escribe a mano. El
  documento cita a Martínez (2023) sobre microempresas que ignoran los costos indirectos: que el
  usuario tipee un número no resuelve ese problema, calcularlo sí.
- **`EventoUso`, `Alerta` y `LineaBase` no son features para el microempresario**: son la
  instrumentación que permite escribir el capítulo de resultados. Sin ellas, los indicadores de la
  tabla de operativización del documento quedan sin datos.
- **`Recomendacion.datosJson` guarda las cifras que originaron cada recomendación**, y la interfaz las
  muestra. Regla dura: la pantalla no afirma nada que no pueda respaldar con filas de la base.

## Convenciones

- Vistas en `client/src/views/`; dos exportan pares de pantallas relacionadas
  (`MaterialesCosteo.jsx` → `Materiales` + `Costeo`, `CatalogoPersonalizar.jsx` → `Catalogo` +
  `Personalizador`). Solo exportaciones nombradas, sin `default` fuera de `App.jsx`.
- Cada archivo abre con un banner `// ===` que dice qué es el módulo y, cuando importa, **por qué** está
  diseñado así. Mantener ese estilo, en español.
- Modales con `Modal` de `client/src/components/Modal.jsx`, con `FormField` e `inputClass`. No
  construir cromo de modal a mano ni reestilizar inputs en línea.
- Sistema visual: paleta stone, acento orange-500, `rounded-sm` (no `rounded-lg`), títulos
  `font-black tracking-tight`, etiquetas pequeñas en mayúsculas con `tracking-[0.25em]`.
- Iconos de `lucide-react`.
- Validación de entrada en el servidor con **Zod** en todos los endpoints.

## Brechas conocidas contra el documento de tesis

Estado a la fecha. La auditoría completa (30 puntos priorizados) y el plan de obra por sprints están
en el archivo de plan de la sesión.

**Ya resuelto**
- Objetivo 4 (separación personal/negocio): campo `origen`, alerta de mezcla, doble cálculo de ganancia.
- Motor de costeo con pruebas: costo unitario, margen de contribución, punto de equilibrio, prorrateo
  de CIF. 16 pruebas en `server/test/costeo.test.js`, escritas contra cálculos hechos a mano.
- Esquema de base de datos completo (19 tablas) con órdenes de producción, kardex y costos fijos.

**Pendiente**
- El frontend sigue leyendo de `client/src/data/mockData.js`. Migrar a llamadas HTTP y borrar ese archivo.
- Autenticación, tenancy y toda la capa de rutas del servidor.
- Fechas: en el modelo nuevo ya son `DATE`; el cliente todavía las maneja como texto `DD/MM/YYYY`.
- La pantalla de recomendaciones muestra cifras inventadas ("247 movimientos"). No debe llegar así a
  la defensa.
- El gráfico semanal del panel usa datos fijos mientras los KPIs se calculan en vivo.
- El indicador de conexión está fijo en `true` y puede mostrar "SIN CONEXIÓN" siendo mentira.
- Sin diseño para celular, siendo que el ítem 8 de la encuesta pregunta justamente por uso en celular.
- Exportar a PDF/Excel solo muestra un aviso.

## Notas de despliegue

- **No usar Render Postgres**: su plan gratuito expira a los 90 días y borra la base. Neon no caduca.
- El plan gratuito de Render duerme el servidor tras 15 min sin tráfico; la primera petición tarda
  30–50 s. Mitigado con ping a `/health` cada 14 min y pantalla de carga honesta en el cliente.
- `server/.env.example` documenta las variables. Nunca versionar `.env`.
- Quedan 3 vulnerabilidades altas en el CLI de Prisma (`deepmerge-ts`), herramienta de build, no código
  en producción. Revisar cuando Prisma 7 esté maduro.
