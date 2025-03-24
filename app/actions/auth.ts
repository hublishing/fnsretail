'use server'

import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'

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

    await signInWithEmailAndPassword(auth, email as string, password as string)
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