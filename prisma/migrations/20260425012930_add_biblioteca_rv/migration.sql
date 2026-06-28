-- CreateTable
CREATE TABLE "EjercicioRV" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "altNombre" TEXT,
    "movimiento" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "rank" TEXT NOT NULL,
    "bloquesIdeal" TEXT[],
    "musculosObjetivo" TEXT[],
    "transferencia" INTEGER NOT NULL,
    "tecnicaClave" TEXT NOT NULL,
    "cuandoUsarlo" TEXT NOT NULL,
    "erroresComunes" TEXT NOT NULL,
    "cargaRecomendada" TEXT NOT NULL,
    "seriesRecomendadas" TEXT NOT NULL,
    "referencia" TEXT,
    "videoUrl" TEXT,
    "notasCoach" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EjercicioRV_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProtocoloRV" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "subtitulo" TEXT,
    "categoria" TEXT NOT NULL,
    "bloques" TEXT[],
    "nivel" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "objetivo" TEXT NOT NULL,
    "cuandoUsarlo" TEXT NOT NULL,
    "comoEjecutar" TEXT NOT NULL,
    "errores" TEXT NOT NULL,
    "ejemplo" TEXT NOT NULL,
    "advertencia" TEXT NOT NULL,
    "progresion" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProtocoloRV_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EjercicioRV_externalId_key" ON "EjercicioRV"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ProtocoloRV_externalId_key" ON "ProtocoloRV"("externalId");
