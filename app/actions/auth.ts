'use server'

import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'

export interface LoginResult {
  success: boolean
  error?: string
  user?: {
    email: string
    uid: string
  }
}

export async function login(state: LoginResult, formData: FormData): Promise<LoginResult> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return {
      success: false,
      error: '이메일과 비밀번호를 모두 입력해주세요.'
    }
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    return {
      success: true,
      user: {
        email: user.email || '',
        uid: user.uid
      }
    }
  } catch (error: any) {
    let errorMessage = '로그인에 실패했습니다.'

    if (error.code === 'auth/invalid-email') {
      errorMessage = '유효하지 않은 이메일 형식입니다.'
    } else if (error.code === 'auth/user-not-found') {
      errorMessage = '등록되지 않은 이메일입니다.'
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = '잘못된 비밀번호입니다.'
    }

    return {
      success: false,
      error: errorMessage
    }
  }
}

