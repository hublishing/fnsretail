import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // 세션 토큰 확인
  const token = request.cookies.get('session')
  
  // 보호할 경로 목록
  const protectedPaths = ['/cart', '/dynamic-table', '/dashboard']
  
  // 현재 경로가 보호된 경로인지 확인
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )

  // 보호된 경로이고 토큰이 없는 경우 로그인 페이지로 리다이렉트
  if (isProtectedPath && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

// 미들웨어가 실행될 경로 설정
export const config = {
  matcher: ['/cart/:path*', '/dynamic-table/:path*', '/dashboard/:path*']
} 