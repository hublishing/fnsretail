'use server'

import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'

export interface LoginResult {
  success: boolean
  error: string
}

export async function login(prevState: LoginResult, formData: FormData): Promise<LoginResult> {
  try {
    const username = formData.get('username')
    const password = formData.get('password')

    if (!username || !password) {
      return {
        success: false,
        error: '아이디와 비밀번호를 모두 입력해주세요.'
      }
    }

    // 임시 로그인 로직
    if (username === 'admin' && password === 'admin123') {
      return { success: true, error: '' }
    }

    return {
      success: false,
      error: '아이디 또는 비밀번호가 올바르지 않습니다.'
    }
  } catch (error) {
    console.error('로그인 오류:', error)
    return {
      success: false,
      error: '로그인 처리 중 오류가 발생했습니다.'
    }
  }
} 