-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'COMPROBANTE_SUBIDO', 'CONFIRMADO', 'RECHAZADO');

-- AlterTable
ALTER TABLE "pedidos" ADD COLUMN     "comprobanteUrl" TEXT,
ADD COLUMN     "estadoPago" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
ADD COLUMN     "notaPago" TEXT,
ADD COLUMN     "pagadoEn" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "talleres" ADD COLUMN     "qrBanco" TEXT,
ADD COLUMN     "qrTitular" TEXT,
ADD COLUMN     "qrUrl" TEXT;
