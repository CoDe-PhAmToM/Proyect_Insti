-- AlterTable
ALTER TABLE "registros" ADD COLUMN     "anuladoEn" TIMESTAMP(3),
ADD COLUMN     "anuladoPorId" TEXT,
ADD COLUMN     "motivoAnulacion" TEXT;

-- CreateTable
CREATE TABLE "errores_app" (
    "id" TEXT NOT NULL,
    "origen" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "pila" TEXT,
    "ruta" TEXT,
    "usuarioId" TEXT,
    "tallerId" TEXT,
    "navegador" TEXT,
    "metadata" JSONB,
    "resuelto" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "errores_app_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "errores_app_creadoEn_idx" ON "errores_app"("creadoEn");

-- CreateIndex
CREATE INDEX "errores_app_resuelto_idx" ON "errores_app"("resuelto");

-- AddForeignKey
ALTER TABLE "registros" ADD CONSTRAINT "registros_anuladoPorId_fkey" FOREIGN KEY ("anuladoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "errores_app" ADD CONSTRAINT "errores_app_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
