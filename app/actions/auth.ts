'use server'

import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth as firebaseAdminAuth } from '@/lib/firebase-admin'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'

export interface LoginResult {
  success: boolean
  error: string
}

export async function login(prevState: LoginResult, formData: FormData): Promise<LoginResult> {
  try {
    const email = formData.get('username')
    const password = formData.get('password')

    if (!email || !password) {
      return {
        success: false,
        error: '이메일과 비밀번호를 모두 입력해주세요.'
      }
    }

    const userCredential = await signInWithEmailAndPassword(auth, email as string, password as string)
    const idToken = await userCredential.user.getIdToken()
    
    // 서버에서 토큰 검증
    const decodedToken = await firebaseAdminAuth.verifyIdToken(idToken)
    
    // 쿠키에 세션 저장
    const expiresIn = 60 * 60 * 24 * 5 * 1000 // 5일
    const sessionCookie = await firebaseAdminAuth.createSessionCookie(idToken, { expiresIn })
    
    const cookieStore = await cookies()
    cookieStore.set('session', sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    })

    return { success: true, error: '' }
  } catch (error: any) {
    console.error('로그인 오류:', error)
    return {
      success: false,
      error: error.code === 'auth/invalid-credential' 
        ? '이메일 또는 비밀번호가 올바르지 않습니다.'
        : '로그인 처리 중 오류가 발생했습니다.'
    }
  }
}

export async function signInWithGoogle() {
  try {
    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(auth, provider)
    const idToken = await result.user.getIdToken()
    
    // 서버에서 토큰 검증
    const decodedToken = await firebaseAdminAuth.verifyIdToken(idToken)
    
    // 쿠키에 세션 저장
    const expiresIn = 60 * 60 * 24 * 5 * 1000 // 5일
    const sessionCookie = await firebaseAdminAuth.createSessionCookie(idToken, { expiresIn })
    
    const cookieStore = await cookies()
    cookieStore.set('session', sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    })

    redirect('/')
  } catch (error) {
    console.error('Google 로그인 오류:', error)
    throw new Error('로그인에 실패했습니다.')
  }
}

export async function signOut() {
  const cookieStore = await cookies()
  cookieStore.delete('session')
  redirect('/login')
}

export async function getSession() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value || ''
  
  if (!sessionCookie) {
    return null
  }

  try {
    const decodedClaims = await firebaseAdminAuth.verifySessionCookie(sessionCookie, true)
    return decodedClaims
  } catch (error) {
    console.error('세션 검증 오류:', error)
    return null
  }
} 