import { prisma } from '@/lib/db';
import { sitePool } from '@/lib/site-db';

export async function GET() {
  try {
    const [atletasCount, sesionesCount, tonelajeResult, configResult] = await Promise.all([
      prisma.athleteProfile.count(),

      prisma.seguimientoAtleta.count({
        where: {
          fechaRealizacion: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),

      prisma.seguimientoAtleta.aggregate({
        _sum: { pesoUsado: true },
      }),

      sitePool.query("SELECT value FROM site_config WHERE key = 'cupos'"),
    ]);

    const tonelajeKg = Math.round((tonelajeResult._sum.pesoUsado ?? 0) / 1000);

    return Response.json({
      atletas:       atletasCount,
      sesiones_mes:  sesionesCount,
      tonelaje_ton:  tonelajeKg,
      cupos:         parseInt(configResult.rows[0]?.value ?? '0'),
    });
  } catch {
    return Response.json({ atletas: 0, sesiones_mes: 0, tonelaje_ton: 0, cupos: 0 });
  }
}
