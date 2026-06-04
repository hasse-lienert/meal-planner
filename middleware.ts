import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow login page and API routes (extension uses /api/recipes with its own secret)
  if (pathname === '/login' || pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const session = request.cookies.get('mp_session')
  if (session?.value !== 'authenticated') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
