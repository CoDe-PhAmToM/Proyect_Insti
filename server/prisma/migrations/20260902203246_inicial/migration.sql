-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'PRODUCTOR', 'AYUDANTE', 'CLIENTE');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('INGRESO', 'EGRESO', 'RETIRO');

-- CreateEnum
CREATE TYPE "OrigenFondo" AS ENUM ('NEGOCIO', 'PERSONAL');

-- CreateEnum
CREATE TYPE "EstadoOrden" AS ENUM ('BORRADOR', 'EN_PROCESO', 'TERMINADA', 'ENTREGADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoMovMaterial" AS ENUM ('ENTRADA', 'SALIDA', 'AJUSTE');

-- CreateEnum
CREATE TYPE "TipoCostoOrden" AS ENUM ('MATERIAL', 'MANO_OBRA', 'CIF');

-- CreateEnum
CREATE TYPE "EstadoPedido" AS ENUM ('NUEVO', 'CONFIRMADO', 'EN_PRODUCCION', 'LISTO', 'ENTREGADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "Severidad" AS ENUM ('INFO', 'ADVERTENCIA', 'CRITICA');

-- CreateEnum
CREATE TYPE "TipoRecomendacion" AS ENUM ('OPORTUNIDAD', 'PRECIO', 'ALERTA', 'PRONOSTICO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "rol" "Rol" NOT NULL DEFAULT 'PRODUCTOR',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoAcceso" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "talleres" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "propietarioId" TEXT NOT NULL,
    "distrito" TEXT NOT NULL DEFAULT 'Distrito 6 - El Alto',
    "direccion" TEXT,
    "telefono" TEXT,
    "moneda" TEXT NOT NULL DEFAULT 'BOB',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "enPiloto" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "talleres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios_talleres" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tallerId" TEXT NOT NULL,
    "rolEnTaller" "Rol" NOT NULL DEFAULT 'AYUDANTE',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_talleres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "revocado" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materiales" (
    "id" TEXT NOT NULL,
    "tallerId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "precioUnitario" DECIMAL(12,4) NOT NULL,
    "stock" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "stockMinimo" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materiales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_material" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "tipo" "TipoMovMaterial" NOT NULL,
    "cantidad" DECIMAL(12,4) NOT NULL,
    "costoUnitario" DECIMAL(12,4) NOT NULL,
    "saldoCantidad" DECIMAL(12,4) NOT NULL,
    "saldoValor" DECIMAL(12,2) NOT NULL,
    "ordenId" TEXT,
    "motivo" TEXT,
    "fecha" DATE NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" TEXT NOT NULL,
    "tallerId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precioVenta" DECIMAL(12,2) NOT NULL,
    "manoObraUnitaria" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "imagenUrl" TEXT,
    "emoji" TEXT,
    "categoria" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "publicadoEnTienda" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producto_materiales" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "cantidad" DECIMAL(12,4) NOT NULL,

    CONSTRAINT "producto_materiales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "costos_fijos" (
    "id" TEXT NOT NULL,
    "tallerId" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "montoMensual" DECIMAL(12,2) NOT NULL,
    "vigenteDesde" DATE NOT NULL,
    "vigenteHasta" DATE,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "costos_fijos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordenes_produccion" (
    "id" TEXT NOT NULL,
    "tallerId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "clienteNombre" TEXT,
    "pedidoId" TEXT,
    "fechaPedido" DATE NOT NULL,
    "fechaEntrega" DATE,
    "estado" "EstadoOrden" NOT NULL DEFAULT 'BORRADOR',
    "cantidadProducida" INTEGER NOT NULL DEFAULT 0,
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ordenes_produccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orden_detalles" (
    "id" TEXT NOT NULL,
    "ordenId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitarioVenta" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "orden_detalles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orden_costos" (
    "id" TEXT NOT NULL,
    "ordenId" TEXT NOT NULL,
    "tipo" "TipoCostoOrden" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "cantidad" DECIMAL(12,4),
    "monto" DECIMAL(12,2) NOT NULL,
    "fecha" DATE NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orden_costos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" TEXT NOT NULL,
    "tallerId" TEXT,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "esPersonal" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registros" (
    "id" TEXT NOT NULL,
    "tallerId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "productoId" TEXT,
    "cantidad" DECIMAL(12,2),
    "precioUnitario" DECIMAL(12,2),
    "monto" DECIMAL(12,2) NOT NULL,
    "origen" "OrigenFondo" NOT NULL DEFAULT 'NEGOCIO',
    "metodoPago" TEXT,
    "ordenId" TEXT,
    "creadoPorId" TEXT NOT NULL,
    "esLineaBase" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos" (
    "id" TEXT NOT NULL,
    "tallerId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "estado" "EstadoPedido" NOT NULL DEFAULT 'NUEVO',
    "total" DECIMAL(12,2) NOT NULL,
    "direccionEntrega" TEXT,
    "telefonoContacto" TEXT,
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedido_items" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "color" TEXT,
    "colorHex" TEXT,
    "talla" TEXT,
    "estampadoUrl" TEXT,
    "posicionJson" JSONB,
    "precioUnitario" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "pedido_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_uso" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tallerId" TEXT,
    "tipoEvento" TEXT NOT NULL,
    "entidad" TEXT,
    "duracionMs" INTEGER,
    "metadata" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_uso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas" (
    "id" TEXT NOT NULL,
    "tallerId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "severidad" "Severidad" NOT NULL DEFAULT 'ADVERTENCIA',
    "mensaje" TEXT NOT NULL,
    "entidadRef" TEXT,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "resueltaEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alertas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lineas_base" (
    "id" TEXT NOT NULL,
    "tallerId" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "ingresosDeclarados" DECIMAL(12,2) NOT NULL,
    "egresosDeclarados" DECIMAL(12,2) NOT NULL,
    "retirosDeclarados" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "costoUnitarioEstimado" DECIMAL(12,2),
    "margenConocidoPct" DECIMAL(5,2),
    "cifIdentificados" INTEGER NOT NULL DEFAULT 0,
    "fuente" TEXT NOT NULL DEFAULT 'cuaderno',
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lineas_base_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recomendaciones" (
    "id" TEXT NOT NULL,
    "tallerId" TEXT NOT NULL,
    "tipo" "TipoRecomendacion" NOT NULL,
    "severidad" "Severidad" NOT NULL DEFAULT 'INFO',
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "accion" TEXT,
    "datosJson" JSONB NOT NULL,
    "descartada" BOOLEAN NOT NULL DEFAULT false,
    "generadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recomendaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_rol_idx" ON "usuarios"("rol");

-- CreateIndex
CREATE INDEX "talleres_propietarioId_idx" ON "talleres"("propietarioId");

-- CreateIndex
CREATE INDEX "usuarios_talleres_tallerId_idx" ON "usuarios_talleres"("tallerId");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_talleres_usuarioId_tallerId_key" ON "usuarios_talleres"("usuarioId", "tallerId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_usuarioId_idx" ON "refresh_tokens"("usuarioId");

-- CreateIndex
CREATE INDEX "materiales_tallerId_idx" ON "materiales"("tallerId");

-- CreateIndex
CREATE UNIQUE INDEX "materiales_tallerId_codigo_key" ON "materiales"("tallerId", "codigo");

-- CreateIndex
CREATE INDEX "movimientos_material_materialId_fecha_idx" ON "movimientos_material"("materialId", "fecha");

-- CreateIndex
CREATE INDEX "movimientos_material_ordenId_idx" ON "movimientos_material"("ordenId");

-- CreateIndex
CREATE INDEX "productos_tallerId_idx" ON "productos"("tallerId");

-- CreateIndex
CREATE UNIQUE INDEX "productos_tallerId_sku_key" ON "productos"("tallerId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "producto_materiales_productoId_materialId_key" ON "producto_materiales"("productoId", "materialId");

-- CreateIndex
CREATE INDEX "costos_fijos_tallerId_vigenteDesde_idx" ON "costos_fijos"("tallerId", "vigenteDesde");

-- CreateIndex
CREATE UNIQUE INDEX "ordenes_produccion_pedidoId_key" ON "ordenes_produccion"("pedidoId");

-- CreateIndex
CREATE INDEX "ordenes_produccion_tallerId_estado_idx" ON "ordenes_produccion"("tallerId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "ordenes_produccion_tallerId_numero_key" ON "ordenes_produccion"("tallerId", "numero");

-- CreateIndex
CREATE INDEX "orden_detalles_ordenId_idx" ON "orden_detalles"("ordenId");

-- CreateIndex
CREATE INDEX "orden_costos_ordenId_tipo_idx" ON "orden_costos"("ordenId", "tipo");

-- CreateIndex
CREATE INDEX "categorias_tallerId_idx" ON "categorias"("tallerId");

-- CreateIndex
CREATE INDEX "registros_tallerId_fecha_idx" ON "registros"("tallerId", "fecha");

-- CreateIndex
CREATE INDEX "registros_tallerId_tipo_idx" ON "registros"("tallerId", "tipo");

-- CreateIndex
CREATE INDEX "registros_ordenId_idx" ON "registros"("ordenId");

-- CreateIndex
CREATE INDEX "pedidos_clienteId_idx" ON "pedidos"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_tallerId_numero_key" ON "pedidos"("tallerId", "numero");

-- CreateIndex
CREATE INDEX "pedido_items_pedidoId_idx" ON "pedido_items"("pedidoId");

-- CreateIndex
CREATE INDEX "eventos_uso_tallerId_creadoEn_idx" ON "eventos_uso"("tallerId", "creadoEn");

-- CreateIndex
CREATE INDEX "eventos_uso_tipoEvento_idx" ON "eventos_uso"("tipoEvento");

-- CreateIndex
CREATE INDEX "alertas_tallerId_leida_idx" ON "alertas"("tallerId", "leida");

-- CreateIndex
CREATE INDEX "alertas_tipo_idx" ON "alertas"("tipo");

-- CreateIndex
CREATE UNIQUE INDEX "lineas_base_tallerId_periodo_key" ON "lineas_base"("tallerId", "periodo");

-- CreateIndex
CREATE INDEX "recomendaciones_tallerId_descartada_idx" ON "recomendaciones"("tallerId", "descartada");

-- AddForeignKey
ALTER TABLE "talleres" ADD CONSTRAINT "talleres_propietarioId_fkey" FOREIGN KEY ("propietarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_talleres" ADD CONSTRAINT "usuarios_talleres_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_talleres" ADD CONSTRAINT "usuarios_talleres_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "talleres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materiales" ADD CONSTRAINT "materiales_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "talleres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_material" ADD CONSTRAINT "movimientos_material_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materiales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_material" ADD CONSTRAINT "movimientos_material_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "ordenes_produccion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "talleres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_materiales" ADD CONSTRAINT "producto_materiales_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_materiales" ADD CONSTRAINT "producto_materiales_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materiales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "costos_fijos" ADD CONSTRAINT "costos_fijos_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "talleres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_produccion" ADD CONSTRAINT "ordenes_produccion_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "talleres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_produccion" ADD CONSTRAINT "ordenes_produccion_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_detalles" ADD CONSTRAINT "orden_detalles_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "ordenes_produccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_detalles" ADD CONSTRAINT "orden_detalles_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_costos" ADD CONSTRAINT "orden_costos_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "ordenes_produccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "talleres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros" ADD CONSTRAINT "registros_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "talleres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros" ADD CONSTRAINT "registros_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros" ADD CONSTRAINT "registros_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros" ADD CONSTRAINT "registros_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "ordenes_produccion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros" ADD CONSTRAINT "registros_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "talleres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_items" ADD CONSTRAINT "pedido_items_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_items" ADD CONSTRAINT "pedido_items_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_uso" ADD CONSTRAINT "eventos_uso_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_uso" ADD CONSTRAINT "eventos_uso_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "talleres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "talleres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lineas_base" ADD CONSTRAINT "lineas_base_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "talleres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recomendaciones" ADD CONSTRAINT "recomendaciones_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "talleres"("id") ON DELETE CASCADE ON UPDATE CASCADE;
