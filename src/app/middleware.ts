// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  // the Firebase SDK (client side) writes a cookie called "__session"
  const session = req.cookies.get('__session')?.value

  if (!session) {
    // not signed in → bounce to your login page
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/'
    return NextResponse.redirect(loginUrl)
  }

  // session cookie exists → allow the request through
  return NextResponse.next()
}

export const config = {
  matcher: ['/listproductpreview/:path*']
}
