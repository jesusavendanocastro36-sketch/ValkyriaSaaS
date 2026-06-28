-- Migration: Replace BOTTOM_UP with POR_BLOQUES in TipoPeriodizacion enum
-- Existing BOTTOM_UP periodizations are mapped to POR_BLOQUES (most similar concept)

-- Step 1: Rename old enum to preserve it during transition
ALTER TYPE "TipoPeriodizacion" RENAME TO "TipoPeriodizacion_old";

-- Step 2: Create new enum with POR_BLOQUES instead of BOTTOM_UP
CREATE TYPE "TipoPeriodizacion" AS ENUM ('LINEAL', 'ONDULANTE', 'CONJUGADA', 'POR_BLOQUES');

-- Step 3: Migrate column, converting any BOTTOM_UP rows to POR_BLOQUES
ALTER TABLE "Periodizacion"
  ALTER COLUMN tipo TYPE "TipoPeriodizacion"
  USING CASE tipo::text
    WHEN 'BOTTOM_UP' THEN 'POR_BLOQUES'::"TipoPeriodizacion"
    ELSE tipo::text::"TipoPeriodizacion"
  END;

-- Step 4: Drop old enum
DROP TYPE "TipoPeriodizacion_old";
