import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';

export async function GET(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const payload = verifyToken(token);
  if (!payload || payload.rol !== 'ADMIN') {
    return NextResponse.json({ error: 'Solo el coach puede descargar backups' }, { status: 403 });
  }

  const [atletas, periodizaciones, seguimientos, mensajes] = await Promise.all([
    prisma.athleteProfile.findMany({
      include: { user: { select: { email: true, nombre: true, createdAt: true } } },
    }),
    prisma.periodizacion.findMany({
      include: {
        bloques: {
          include: {
            sesiones: {
              include: { ejercicios: true },
            },
          },
        },
      },
    }),
    prisma.seguimientoAtleta.findMany({
      orderBy: { createdAt: 'desc' },
    }),
    prisma.mensaje.findMany({
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const backup = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    atletas,
    periodizaciones,
    seguimientos,
    mensajes,
  };

  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="valkyria-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
