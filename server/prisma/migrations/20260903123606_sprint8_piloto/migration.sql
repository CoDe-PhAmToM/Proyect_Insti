-- AlterTable
ALTER TABLE "productos" ADD COLUMN     "stock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stockMinimo" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "codigos_reseteo" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "codigoHash" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "usadoEn" TIMESTAMP(3),
    "emitidoPor" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "codigos_reseteo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_producto" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "tipo" "TipoMovMaterial" NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "saldo" INTEGER NOT NULL,
    "ordenId" TEXT,
    "registroId" TEXT,
    "motivo" TEXT,
    "fecha" DATE NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "respuestas_sus" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tallerId" TEXT,
    "respuestas" INTEGER[],
    "puntaje" DECIMAL(5,2) NOT NULL,
    "comentario" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "respuestas_sus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "codigos_reseteo_codigoHash_key" ON "codigos_reseteo"("codigoHash");

-- CreateIndex
CREATE INDEX "codigos_reseteo_usuarioId_idx" ON "codigos_reseteo"("usuarioId");

-- CreateIndex
CREATE INDEX "movimientos_producto_productoId_fecha_idx" ON "movimientos_producto"("productoId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "respuestas_sus_usuarioId_key" ON "respuestas_sus"("usuarioId");

-- AddForeignKey
ALTER TABLE "codigos_reseteo" ADD CONSTRAINT "codigos_reseteo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_producto" ADD CONSTRAINT "movimientos_producto_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuestas_sus" ADD CONSTRAINT "respuestas_sus_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuestas_sus" ADD CONSTRAINT "respuestas_sus_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "talleres"("id") ON DELETE CASCADE ON UPDATE CASCADE;
