import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(req: NextRequest) {
  if (req.nextUrl.pathname === '/') {
    return NextResponse.rewrite(new URL('/index.html', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
