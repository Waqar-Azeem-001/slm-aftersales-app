import { NextResponse, type NextRequest } from 'next/server';

/** Optional site-wide password (HTTP Basic). Set APP_PASSWORD in .env / Vercel to enable. */
export function middleware(req: NextRequest) {
  const pass = process.env.APP_PASSWORD;
  if (!pass) return NextResponse.next();
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Basic ')) {
    const decoded = atob(auth.slice(6));
    if (decoded.slice(decoded.indexOf(':') + 1) === pass) return NextResponse.next();
  }
  return new NextResponse('Authentication required', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="SLM After-Sales"' } });
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest).*)'] };
