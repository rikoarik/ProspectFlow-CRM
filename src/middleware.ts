import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/_next')) return NextResponse.next()
  if (request.nextUrl.pathname === '/login') return NextResponse.next()
  if (request.nextUrl.pathname.startsWith('/api/auth')) return NextResponse.next()

  const hasSession = request.cookies
    .getAll()
    .some((c) => c.name.includes('-auth-token'))

  if (!hasSession) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname + request.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|favicon|login|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)'],
}