import { extractToken, verifyToken } from '@/lib/auth';
import { reportJobs } from '../../generar-reporte/route';

export async function GET(req: Request, { params }: { params: Promise<{ job_id: string }> }) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { job_id } = await params;
  const job = reportJobs[job_id];
  if (!job) return Response.json({ error: 'Job no encontrado' }, { status: 404 });

  return Response.json({
    job_id,
    status: job.status,
    resultado: job.resultado ?? null,
    error: job.error ?? null,
  });
}
