-- CreateTable
CREATE TABLE "NotaSesion" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "sesionId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contenido" TEXT NOT NULL,

    CONSTRAINT "NotaSesion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotaSesion_athleteId_fecha_idx" ON "NotaSesion"("athleteId", "fecha");

-- AddForeignKey
ALTER TABLE "NotaSesion" ADD CONSTRAINT "NotaSesion_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
