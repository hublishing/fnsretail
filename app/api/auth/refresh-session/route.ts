import { NextResponse } from 'next/server';
import { auth as firebaseAdminAuth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: '토큰이 필요합니다.' },
        { status: 400 }
      );
    }

    // Firebase Admin으로 토큰 검증
    const decodedToken = await firebaseAdminAuth.verifyIdToken(token);
    
    // 세션 쿠키 생성
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5일
    const sessionCookie = await firebaseAdminAuth.createSessionCookie(token, { expiresIn });
    
    // 쿠키 설정
    const cookieStore = cookies();
    cookieStore.set('session', sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('세션 갱신 오류:', error);
    return NextResponse.json(
      { error: '세션 갱신에 실패했습니다.' },
      { status: 401 }
    );
  }
} 