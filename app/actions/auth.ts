'use server'

import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'

export interface LoginResult {
  success: boolean
  error: string
}

export async function login(prevState: LoginResult, formData: FormData): Promise<LoginResult> {
  const email = formData.get('email')
  const password = formData.get('password')

  // 임시 로그인 로직
  if (email === 'admin@example.com' && password === 'admin123') {
    return { success: true, error: '' }
  }

  return {
    success: false,
    error: '이메일 또는 비밀번호가 올바르지 않습니다.'
  }
}

