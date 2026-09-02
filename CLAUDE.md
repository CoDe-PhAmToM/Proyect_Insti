# CLAUDE.md

Este archivo le da contexto a Claude Code sobre este proyecto. Léelo completo antes de tocar código.

## Qué es esto

**Plataforma de Gestión Financiera para la Rentabilidad en la Producción en Microempresas de Confección Informal del Distrito 6, El Alto.**

Proyecto de tesis conjunto entre **Ingeniería de Sistemas** y **Contaduría Pública** (UPEA, Universidad Pública de El Alto, Bolivia). Resolución HCC N.º /2026.

**El problema real que resuelve:** los dueños de talleres de confección en el Distrito 6 mezclan la plata del negocio con la plata personal, ponen precios copiando a la competencia en vez de calcular sus costos reales, y no saben si están ganando o perdiendo dinero. Todo lo llevan en cuadernos, facturas sueltas o de memoria.

**Población objetivo:** microempresarios informales de confección (poleras, chamarras, jeans, deportivos), con bajo nivel de alfabetización digital y conectividad limitada. **Esto condiciona cada decisión de diseño**: interfaz simple, sin jerga contable, pensada para funcionar con internet intermitente.

**Este no es un CRUD genérico.** Es una herramienta que reemplaza un cuaderno físico. Cualquier campo o flujo nuevo debería preguntarse: "¿esto se parece a lo que ya anota un microempresario a mano, o le agrega fricción?"

## Estado actual: beta visual con datos mock

Este es un **prototipo frontend en React**, sin backend. Todo el estado vive en memoria (React Context) o en `useState` local, no hay persistencia real, no hay autenticación. El objetivo de esta fase es validar flujos e interfaz con el equipo y con microempresarios reales antes de construir el backend en Django.

**No conectes un backend sin que te lo pidan explícitamente.** Si hace falta, se planeó Django + DRF + PostgreSQL, pero eso es fase futura.

No hay suite de tests, linter ni formatter configurado. No inventes comandos para eso.

## Stack

- **React 19** + Vite ⚠️ *(confirmar contra `package.json` — el CLAUDE_mio.md original decía React 18; este dato viene de la lectura directa del código)*
- **Tailwind v4** vía `@import "tailwindcss"` en `src/index.css` — `tailwind.config.cjs` existe pero solo trae `content`, no hay theme custom que extender
- lucide-react (iconos) — ⚠️ está en `devDependencies` pese a usarse en código de runtime; funciona igual porque el bundler no distingue, pero si algún día se hace un install de producción que pode devDependencies, esto rompe. Mover a `dependencies` cuando se toque `package.json`.
- Sin router — la navegación es un `useState('vista')` en `App.jsx` que decide qué vista renderizar
- Sin gestor de estado externo — todo con Context API nativo de React
- Moneda: Bolivianos, formateado siempre `Bs. {n.toFixed(2)}`

## Cómo correr esto

```bash
npm install
npm run dev      # servidor de Vite en puerto 3000, abre el navegador solo
npm run build    # build de producción a dist/
npm run preview  # sirve el build de producción
```

Si compilás en Linux y el `node_modules` viene de Windows (o viceversa), puede faltar el binario nativo de rollup:
```bash
npm install @rollup/rollup-linux-x64-gnu --no-save
```

## Estructura del proyecto

```
src/
  App.jsx                        Punto de entrada. Maneja rol activo y vista activa.
  data/
    mockData.js                  Todos los datos de ejemplo (materiales, productos, registros, catálogo)
    navigation.js                Fuente única de verdad del menú: qué ítems existen, a qué rol
                                  pertenecen, en qué grupo del sidebar van, título/subtítulo de cada vista
  context/
    MaterialesContext.jsx        Estado compartido del inventario de insumos (CRUD)
    RegistrosContext.jsx         Estado compartido de ingresos/egresos + totales derivados
    CartContext.jsx              Estado del carrito del cliente final
  components/
    Layout.jsx                   Sidebar (con switch de rol) + TopBar
    Modal.jsx                    Modal genérico reutilizable + FormField + inputClass
    CartModal.jsx                Modal del carrito (ver items, quitar, confirmar pedido)
  views/
    Dashboard.jsx                Panel del productor. Ganancia con desglose expandible.
    Registros.jsx                Alta de ingresos/egresos con formulario modal
    MaterialesCosteo.jsx         Exporta DOS vistas: Materiales (CRUD) y Costeo (BOM por producto)
    Reportes.jsx                 7 familias de reportes = 80 plantillas de Contaduría (12+10+15+18+9+8+8)
    InteligenciaIA.jsx           Recomendaciones con lenguaje simple, sin jerga técnica
    CatalogoPersonalizar.jsx     Exporta DOS vistas: Catalogo (tienda) y Personalizador (editor de polera)
```

Vistas con named exports únicamente, sin default exports fuera de `App.jsx`.

## Arquitectura — cómo encajan las piezas

**El "router" es una variable de estado.** `vista` en `App.jsx` guarda un id de vista; App renderiza la vista que coincide con cadenas `&&`. No hay react-router. Agregar una pantalla nueva implica dos pasos: agregar la entrada a `NAV_ITEMS` en `src/data/navigation.js`, y agregar la línea `{vista === 'x' && <X />}` en `App.jsx`.

**Dos roles, una sola app.** `rol` es `'productor'` o `'cliente'`. `data/navigation.js` es la única fuente de verdad del menú — cada entrada de `NAV_ITEMS` declara su `rol`, `grupo`, `titulo` y `subtitulo`; Sidebar y TopBar leen de ahí, nunca hardcodees un segundo listado de menú. Cambiar de rol llama a `vistaInicial(rol)` para que el usuario nunca quede en una pantalla del otro rol. En el sistema real esto serán dos logins separados — el switch simula ambas experiencias sin backend de autenticación.

**Tres contextos envuelven toda la app** (`src/context/`), anidados en App como Materiales → Registros → Cart:

- `RegistrosContext` — ingresos/egresos más cada total derivado (`totalIngresos`, `totalEgresos`, `totalPersonal`, `gananciaReal`, `gananciaSinMezcla`, `egresosPorCategoria`). Dashboard, Registros y Reportes consumen todos de acá. **Los agregados financieros nuevos se derivan acá, nunca en una vista** — por eso las tres pantallas nunca pueden mostrar números distintos.
- `MaterialesContext` — el CRUD de materiales. `estado` (`ok`/`bajo`/`critico`) se calcula con `calcularEstado(stock, min)` en cada escritura, nunca lo guarda quien llama.
- `CartContext` — el carrito del lado cliente para Catálogo/Personalizador.

Cada uno expone un hook `useX()` que lanza error si se usa fuera de su provider.

**El costeo lo maneja el BOM.** `PRODUCTOS` en `src/data/mockData.js` referencia materiales por `materialCodigo` (que coincide con `MATERIALES[].codigo`), no por nombre — así que editar un precio en el CRUD de Materiales cambia al instante el costo calculado. La cadena en `Costeo` (`src/views/MaterialesCosteo.jsx:321`): líneas del BOM × precio vigente del material → `subtotalMat` + `manoObra` + `cif` = `costoTotal` → `× (1 + margen/100)` = `precioSugerido`. Las líneas cuyo material fue borrado se marcan `faltante` en vez de romper. **Ojo:** `productos` es `useState` local en `Costeo` — los productos que se agregan ahí no persisten al cambiar de vista (materiales y registros sí, por vivir en context).

**Reportes** (`src/views/Reportes.jsx`) modela las 80 plantillas contables que definió el equipo de Contaduría, agrupadas en 7 familias cuyos conteos de `plantillas` suman 80. Cuatro familias tienen `disponible: true` y renderizan en vivo desde los contextos (Estado de Resultados, Flujo de Caja, Kardex, Costeo); el resto renderiza un placeholder bloqueado. Los botones de exportar solo muestran un aviso — no hay generación real de PDF/Excel todavía.

**Personalizador** (`src/views/CatalogoPersonalizar.jsx:83`) es una polera dibujada a mano en SVG inline, con `path` para cuerpo/cuello/pliegues, rellenada por `colorTela.hex`. El diseño subido es un data URL en base64, posicionado con un handler de arrastre basado en porcentaje, limitado al área de la polera. Es la única vista a pantalla completa (App oculta el TopBar cuando `vista === 'personalizar'`).

## Patrones que ya establecimos — seguilos

### 1. Un solo Context por dominio de datos, nunca estado duplicado

`MaterialesContext`, `RegistrosContext` y `CartContext` son la única fuente de verdad de sus datos. **Ninguna vista debe tener su propia copia local de materiales, registros o carrito.** Ya cometimos este error una vez (Dashboard tenía su propio array de transacciones hardcodeado, desincronizado del de Registros) y lo corregimos centralizando en Context. Si una vista nueva necesita esos datos, se consume con `useMateriales()` / `useRegistros()` / `useCart()` — nunca se importa el mock directamente ni se duplica en `useState` local.

Los totales derivados (ganancia real, total de personal mezclado, etc.) se calculan **una sola vez dentro del Provider**, no en cada componente que los usa.

### 2. `data/navigation.js` es la única fuente del menú

Si agregás una vista nueva: agregala a `NAV_ITEMS` en `navigation.js` (con su `id`, `rol`, `grupo`, `titulo`, `subtitulo`), y listo — el Sidebar y el `App.jsx` la recogen solos. No dupliques esa info en otro archivo.

### 3. Separación de roles es real, no visual

El switch "Productor / Cliente" en el Sidebar filtra `NAV_ITEMS` por el campo `rol`. Un rol nunca debe poder navegar a una vista del otro rol. En el sistema real esto serán dos logins distintos — el switch es solo para poder demostrar ambas experiencias sin backend de autenticación.

### 4. Formularios van en `Modal.jsx`, con validación explícita

Todo alta/edición usa el componente `Modal` + `FormField` + `inputClass` de `components/Modal.jsx`. Los formularios validan antes de guardar (campos obligatorios, montos > 0) y muestran el error en texto simple, no con toasts genéricos.

### 5. Nunca dejar un botón que no hace nada

Si un botón no tiene la funcionalidad real todavía (ej. exportar PDF en Reportes), que muestre un aviso honesto explicando qué falta conectar — no lo dejes silencioso. Ejemplo real ya implementado: los botones de exportar en `Reportes.jsx` avisan que la exportación real se conecta cuando haya backend (WeasyPrint/openpyxl).

### 6. Tono de todo el copy: para alguien que nunca usó un sistema así

Nada de jerga contable sin explicar. "Ganancia real" mejor que "EBITDA". Los mensajes de alerta explican qué pasó y qué hacer, en español boliviano informal-profesional. Ver `InteligenciaIA.jsx` como referencia de tono.

### 7. Estética visual

Paleta tierra/naranja (`stone-950`, `orange-500`) — nada de morados o azules genéricos de plantilla. Tipografía con mucho peso (`font-black tracking-tight`), esquinas rectas (`rounded-sm`, nunca `rounded-lg`/`rounded-xl`), y labels pequeños en mayúscula tipo "eyebrow" (`text-[10px] tracking-[0.25em] uppercase text-stone-500`). Revisar cualquier vista existente como referencia antes de crear una nueva.

## Convenciones de código

- Cada archivo abre con un comentario banner `// ===` que dice qué es el módulo y, cuando aplica, *por qué* el diseño es así. Mantené ese estilo, y los comentarios en español.
- Variables, funciones y comentarios de negocio en español (`registros`, `agregarRegistro`, `gananciaReal`), consistente con que el dominio (contaduría boliviana, confección) es en español. JSX y sintaxis de React quedan en inglés porque es sintaxis del lenguaje, no del dominio.

## Datos legacy — no conectar código nuevo a esto

`KPIS`, `RECETA_POLERA`, `MANO_OBRA` y `CIF_UNITARIO` en `src/data/mockData.js` son fixtures muertos que quedaron de referencia — Dashboard y Costeo calculan esos valores en vivo, no desde estas constantes.

## Brechas conocidas contra el documento de tesis formal

El documento académico (`DESARROLLO_PLATAFORMA_WEB...docx`, revisado el 2026-08-20) formaliza requerimientos específicos que el beta todavía no cubre. **Antes de asumir que algo "ya está terminado", revisá esta lista:**

### Crítico — metodología del documento, no solo features

1. **Costeo por órdenes de producción.** El documento pide costeo por lote/orden específica (`Objetivo Específico 3`), no solo costeo por producto genérico. Falta la entidad "Orden de Producción" (producto + cantidad + fecha + consumo real de materiales para ese lote).
2. **Punto de equilibrio.** Indicador obligatorio de la variable dependiente. No se calcula en ningún lado todavía.
3. **Margen de contribución** como indicador propio (precio − costos variables), distinto del margen de ganancia/markup que ya existe en `Costeo`.
4. **Alerta cuando el margen cae debajo del 20%.** Regla de negocio explícita mencionada por el investigador. No implementada.
5. **Campos "prenda" y "cantidad" en el formulario de Registros.** El documento pide que los campos del sistema calquen los del cuaderno físico (fecha, prenda, cantidad, precio) para poder medir la migración. Hoy "prenda" y "cantidad" van mezclados en el campo libre `descripcion`.
6. **Desglose de CIF.** Hoy es un número suelto que el usuario tipea en el modal de "Nuevo producto". El documento pide que el sistema ayude a identificar y prorratear los costos indirectos (luz, agua, alquiler) con una base de distribución.
7. **Alerta explícita "egreso > ingreso".** Es un indicador de medición mencionado en la operativización de variables. Hoy el número solo se pinta en rojo si da negativo, no hay una alerta activa como tal.

### Importante — ya lo sabíamos, sigue abierto

8. **Módulo de Ventas/Pedidos del lado productor.** Cuando el cliente confirma un pedido en `CartModal`, el pedido se pierde — no llega a ninguna vista donde el productor lo vea. La intro del documento menciona explícitamente "módulos de costos, ventas e inventarios".
9. **Offline real.** El indicador de conexión en el Sidebar es decorativo. El documento insiste varias veces en "optimizada para entornos de baja conectividad".
10. **Editar/eliminar registros de ingresos/egresos.** Solo se puede crear, no corregir un error de tipeo.

No implementes estos puntos sin que te lo pidan explícitamente — es una lista de referencia, no un backlog a ejecutar de una.

## Errores ya cometidos — no los repitas

- **Datos duplicados entre vistas:** ya pasó con Dashboard/Registros. Solución: todo pasa por Context (ver patrón #1).
- **Sliders/controles ocultos hasta cumplir una condición:** en el Personalizador, los sliders de tamaño/rotación del estampado estaban ocultos hasta subir una imagen. Se corrigió mostrándolos siempre (deshabilitados visualmente con `opacity-40 pointer-events-none` en vez de no-renderizados). Aplicá el mismo criterio a controles similares.
- **KPIs con "cambio %" inventado:** las tarjetas del Dashboard tenían indicadores de tendencia (+8.2%, etc.) sin ningún dato real detrás. Se quitaron al conectar los KPIs a datos reales del Context. No agregues indicadores de tendencia sin una serie histórica real que los respalde.
- **`node_modules` de Windows en un contenedor Linux:** falta el binario nativo de rollup. Ver sección "Cómo correr esto".
