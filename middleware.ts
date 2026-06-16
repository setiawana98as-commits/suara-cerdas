import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from './lib/auth'

const PUBLIC_ROUTES = ['/', '/auth/login', '/auth/register', '/api/auth/login', '/api/auth/register']
const ADMIN_ROUTES = ['/admin']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Izinkan public routes
  if (PUBLIC_ROUTES.some(r => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  // Cek token
  const token = req.cookies.get('sc_token')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  const payload = await verifyToken(token)

  if (!payload) {
    const res = NextResponse.redirect(new URL('/auth/login', req.url))
    res.cookies.delete('sc_token')
    return res
  }

  // Proteksi admin routes
  if (ADMIN_ROUTES.some(r => pathname.startsWith(r)) && payload.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Inject user info ke header untuk API routes
  const headers = new Headers(req.headers)
  headers.set('x-user-id', payload.userId)
  headers.set('x-user-role', payload.role)
  headers.set('x-user-email', payload.email)

  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/api/generate/:path*', '/api/admin/:path*']
}
