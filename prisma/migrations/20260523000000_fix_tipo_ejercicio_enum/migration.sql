-- Add missing enum values to TipoEjercicio
ALTER TYPE "TipoEjercicio" ADD VALUE IF NOT EXISTS 'AUXILIAR';
ALTER TYPE "TipoEjercicio" ADD VALUE IF NOT EXISTS 'COMPENSATORIO';
