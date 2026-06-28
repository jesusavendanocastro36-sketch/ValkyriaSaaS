-- Migration: Add FaseBasico model for per-lift macro planning

-- Step 1: Create enums
CREATE TYPE "BasicoMovimiento" AS ENUM ('SENTADILLA', 'PRESS_BANCA', 'PESO_MUERTO');

CREATE TYPE "BloqueRV" AS ENUM ('HIPERTROFIA', 'FUERZA_BASE', 'VOLUMEN', 'PEAKING', 'TAPERING', 'DESCARGA');

-- Step 2: Create FaseBasico table
CREATE TABLE "FaseBasico" (
  "id"              TEXT NOT NULL,
  "periodizacionId" TEXT NOT NULL,
  "basico"          "BasicoMovimiento" NOT NULL,
  "bloque"          "BloqueRV" NOT NULL,
  "semanaInicio"    INTEGER NOT NULL,
  "semanaFin"       INTEGER NOT NULL,
  "rpeMin"          DOUBLE PRECISION NOT NULL,
  "rpeMax"          DOUBLE PRECISION NOT NULL,
  "porcentajeRmMin" DOUBLE PRECISION,
  "porcentajeRmMax" DOUBLE PRECISION,
  "repsMin"         INTEGER,
  "repsMax"         INTEGER,
  "notas"           TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FaseBasico_pkey" PRIMARY KEY ("id")
);

-- Step 3: FK constraint
ALTER TABLE "FaseBasico"
  ADD CONSTRAINT "FaseBasico_periodizacionId_fkey"
  FOREIGN KEY ("periodizacionId")
  REFERENCES "Periodizacion"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 4: Index
CREATE INDEX "FaseBasico_periodizacionId_idx" ON "FaseBasico"("periodizacionId");
