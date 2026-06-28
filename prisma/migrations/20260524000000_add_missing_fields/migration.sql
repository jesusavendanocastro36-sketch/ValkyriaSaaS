-- Add videoUrl to EjercicioSesion (was in schema but never migrated)
ALTER TABLE "EjercicioSesion" ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;

-- CreateTable PesoHistorial (was in schema but never migrated)
CREATE TABLE IF NOT EXISTS "PesoHistorial" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "peso" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nota" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PesoHistorial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PesoHistorial_athleteId_fecha_idx" ON "PesoHistorial"("athleteId", "fecha");

-- AddForeignKey (only if not exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PesoHistorial_athleteId_fkey'
  ) THEN
    ALTER TABLE "PesoHistorial" ADD CONSTRAINT "PesoHistorial_athleteId_fkey"
      FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
