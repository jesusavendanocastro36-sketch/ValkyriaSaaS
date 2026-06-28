import jwt from 'jsonwebtoken';

const SECRET = process.env.SITE_JWT_SECRET!;

export function signSiteToken(id: string, email: string) {
  return jwt.sign({ sub: id, email, siteAdmin: true }, SECRET, { expiresIn: '7d' });
}

export function verifySiteAdmin(req: Request): { sub: string; email: string } | null {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verify(auth.slice(7), SECRET) as {
      sub: string;
      email: string;
      siteAdmin?: boolean;
    };
    if (!payload.siteAdmin) return null;
    return payload;
  } catch {
    return null;
  }
}
