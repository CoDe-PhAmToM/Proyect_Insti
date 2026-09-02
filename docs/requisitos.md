# requisitos.md

Resumen técnico del documento de tesis para uso de Claude Code. El documento completo es
`DESARROLLO_PLATAFORMA_WEB_MEJORADO_16_08_2026_02.docx` — este archivo extrae solo lo que
afecta decisiones de implementación, sin metodología de investigación ni marco teórico.

## Objetivo general

Diseñar y desarrollar una plataforma de gestión financiera especializada, orientada al
control de los costos de producción y a la optimización de la rentabilidad, en
microempresas de confección informal del Distrito 6 de El Alto.

## Objetivos específicos (los que definen features)

1. **Diagnóstico** — ya cubierto por investigación previa, no requiere código.
2. **Módulos funcionales con plantillas digitales**: registro de inventarios, control de
   gastos operativos y **carga de órdenes de producción**, con validaciones que aseguren
   integridad de los datos. Las plantillas deben facilitar la migración desde apuntes
   físicos (cuaderno) al sistema — de ahí que los campos del formulario calquen los del
   cuaderno (fecha, prenda, cantidad, precio), no una estructura contable abstracta.
3. **Subsistema de costeo por órdenes de producción** que calcule automáticamente:
   - costo unitario real por prenda
   - margen de contribución (precio − costos variables unitarios)
   - punto de equilibrio
4. **Separación contable automática**: categorías predefinidas + alertas que diferencien
   gastos personales de operativos, para no distorsionar el cálculo de rentabilidad real.
5. **Validación con prueba piloto**: reportes comparativos de rentabilidad (por prenda,
   lote y período), mostrando evolución de costo unitario, margen neto y retorno por
   prenda antes/después.

## Indicadores medibles que el sistema debe soportar (tomados de la tabla de
## operativización de variables del documento)

- % de campos de la plataforma que coinciden con los campos comunes en cuadernos:
  **fecha, prenda, cantidad, precio**.
- Tiempo promedio en registrar una transacción (primera semana vs. tercera semana).
- **N° de alertas automáticas generadas**: datos incorrectos, y **egreso > ingreso**.
- Diferencia en Bs (ingresos − egresos − retiros) entre línea base y post prueba piloto.
- % de prendas cuyo margen real es conocido por el confeccionista (antes vs. después).
- N° de costos indirectos (CIF) identificados y registrados (antes vs. después).

## Restricciones de diseño no negociables

- Población objetivo con bajo nivel de alfabetización digital y conectividad limitada →
  interfaz simple, sin jerga contable, tolerante a internet intermitente.
- El sistema reemplaza un cuaderno físico, no es un ERP contable genérico. Cualquier
  campo nuevo debe parecerse a lo que un microempresario ya anota a mano.

## Brechas actuales del prototipo frente a estos objetivos

Ver la sección "Brechas conocidas contra el documento de tesis formal" en `CLAUDE.md` —
esa lista ya está verificada contra este documento y es la fuente de verdad de qué falta
implementar, en orden de prioridad.
