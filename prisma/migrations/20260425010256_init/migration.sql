-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'ATHLETE');

-- CreateEnum
CREATE TYPE "TipoPeriodizacion" AS ENUM ('LINEAL', 'ONDULANTE', 'CONJUGADA', 'BOTTOM_UP');

-- CreateEnum
CREATE TYPE "EstadoPeriodizacion" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TipoEjercicio" AS ENUM ('COMPETITIVO', 'VARIANTE', 'ACCESORIO', 'MOVILIDAD');

-- CreateEnum
CREATE TYPE "TipoRecomendacion" AS ENUM ('AJUSTE_RPE', 'CAMBIO_VOLUMEN', 'CAMBIO_EJERCICIO', 'RECUPERACION', 'MOVILIDAD', 'TECNICA');

-- CreateEnum
CREATE TYPE "EstadoRecomendacion" AS ENUM ('PENDIENTE', 'ACEPTADA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "TipoMensaje" AS ENUM ('TEXTO', 'VIDEO_LINK', 'ARTICULO', 'RECOMENDACION');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" "UserRole" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "experienciaAnos" INTEGER,
    "especialidades" TEXT[],
    "imagenPerfil" TEXT,
    "telefono" TEXT,
    "ubicacion" TEXT,
    "biografia" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "pesoActual" DOUBLE PRECISION,
    "altura" DOUBLE PRECISION,
    "edad" INTEGER,
    "categoriaPeso" TEXT,
    "experienciaPowerlifting" TEXT NOT NULL DEFAULT 'principiante',
    "lesionesActuales" TEXT[],
    "objetivos" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Periodizacion" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoPeriodizacion" NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "duracionSemanas" INTEGER NOT NULL,
    "objetivo" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" "EstadoPeriodizacion" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Periodizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BloqueEntrenamiento" (
    "id" TEXT NOT NULL,
    "periodizacionId" TEXT NOT NULL,
    "numeroBloque" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "semanaInicio" INTEGER NOT NULL,
    "semanaFin" INTEGER NOT NULL,
    "enfasis" TEXT NOT NULL,
    "intensidadRpeMin" DOUBLE PRECISION NOT NULL,
    "intensidadRpeMax" DOUBLE PRECISION NOT NULL,
    "volumenRepsMin" INTEGER,
    "volumenRepsMax" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BloqueEntrenamiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SesionEntrenamiento" (
    "id" TEXT NOT NULL,
    "bloqueId" TEXT NOT NULL,
    "numeroSemana" INTEGER NOT NULL,
    "diaSemana" TEXT NOT NULL,
    "fecha" TIMESTAMP(3),
    "movimientoPrincipal" TEXT NOT NULL,
    "enfocuoDia" TEXT NOT NULL,
    "descripcion" TEXT,
    "ordenSecuencia" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SesionEntrenamiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EjercicioSesion" (
    "id" TEXT NOT NULL,
    "sesionId" TEXT NOT NULL,
    "ejercicioNombre" TEXT NOT NULL,
    "tipoEjercicio" "TipoEjercicio" NOT NULL,
    "setsProgramados" INTEGER NOT NULL,
    "repsProgramadas" INTEGER NOT NULL,
    "rpeProgramado" DOUBLE PRECISION NOT NULL,
    "pesoProgramado" DOUBLE PRECISION,
    "restMinutos" INTEGER NOT NULL DEFAULT 3,
    "notasTecnicas" TEXT,
    "orden" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EjercicioSesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeguimientoAtleta" (
    "id" TEXT NOT NULL,
    "ejercicioSesionId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "fechaRealizacion" TIMESTAMP(3) NOT NULL,
    "numeroSet" INTEGER NOT NULL,
    "repsRealizadas" INTEGER NOT NULL,
    "pesoUsado" DOUBLE PRECISION NOT NULL,
    "rpeReportado" DOUBLE PRECISION NOT NULL,
    "completado" BOOLEAN NOT NULL DEFAULT true,
    "notasAtleta" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeguimientoAtleta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EjercicioBiblioteca" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" "TipoEjercicio" NOT NULL,
    "gruposMusculares" TEXT[],
    "descripcion" TEXT,
    "cuesTecnicos" TEXT[],
    "notasSeguridad" TEXT,
    "videoUrl" TEXT,
    "equipamientoReq" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EjercicioBiblioteca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecomendacionAI" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "periodizacionId" TEXT,
    "tipo" "TipoRecomendacion" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "razonGenerada" TEXT,
    "ejercicioAlternativo" TEXT,
    "parametrosSugeridos" JSONB,
    "estado" "EstadoRecomendacion" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecomendacionAI_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mensaje" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "tipo" "TipoMensaje" NOT NULL DEFAULT 'TEXTO',
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mensaje_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CoachProfile_userId_key" ON "CoachProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AthleteProfile_userId_key" ON "AthleteProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EjercicioBiblioteca_coachId_nombre_key" ON "EjercicioBiblioteca"("coachId", "nombre");

-- AddForeignKey
ALTER TABLE "CoachProfile" ADD CONSTRAINT "CoachProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteProfile" ADD CONSTRAINT "AthleteProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteProfile" ADD CONSTRAINT "AthleteProfile_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "CoachProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Periodizacion" ADD CONSTRAINT "Periodizacion_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "CoachProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Periodizacion" ADD CONSTRAINT "Periodizacion_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloqueEntrenamiento" ADD CONSTRAINT "BloqueEntrenamiento_periodizacionId_fkey" FOREIGN KEY ("periodizacionId") REFERENCES "Periodizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SesionEntrenamiento" ADD CONSTRAINT "SesionEntrenamiento_bloqueId_fkey" FOREIGN KEY ("bloqueId") REFERENCES "BloqueEntrenamiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EjercicioSesion" ADD CONSTRAINT "EjercicioSesion_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "SesionEntrenamiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeguimientoAtleta" ADD CONSTRAINT "SeguimientoAtleta_ejercicioSesionId_fkey" FOREIGN KEY ("ejercicioSesionId") REFERENCES "EjercicioSesion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeguimientoAtleta" ADD CONSTRAINT "SeguimientoAtleta_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EjercicioBiblioteca" ADD CONSTRAINT "EjercicioBiblioteca_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "CoachProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecomendacionAI" ADD CONSTRAINT "RecomendacionAI_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "CoachProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecomendacionAI" ADD CONSTRAINT "RecomendacionAI_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecomendacionAI" ADD CONSTRAINT "RecomendacionAI_periodizacionId_fkey" FOREIGN KEY ("periodizacionId") REFERENCES "Periodizacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensaje" ADD CONSTRAINT "Mensaje_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensaje" ADD CONSTRAINT "Mensaje_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
