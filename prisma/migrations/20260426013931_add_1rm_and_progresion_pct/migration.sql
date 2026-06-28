-- AlterTable
ALTER TABLE "AthleteProfile" ADD COLUMN     "rmBench" DOUBLE PRECISION,
ADD COLUMN     "rmDeadlift" DOUBLE PRECISION,
ADD COLUMN     "rmSquat" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Periodizacion" ADD COLUMN     "progresionPct" JSONB;
