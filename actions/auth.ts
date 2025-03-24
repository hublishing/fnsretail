'use server'

import { redirect } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { signInWithEmailAndPassword } from 'firebase/auth'

export interface LoginResult {
  success: boolean;
  error?: string;
  user?: {
    email: string;
    uid: string;
  };
}

export async function login(prevState: LoginResult, formData: FormData): Promise<LoginResult> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { 
      success: false, 
      error: '이메일과 비밀번호를 입력해주세요' 
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
    console.error('로그인 오류:', error)
    let errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다'
    
    switch (error.code) {
      case 'auth/invalid-email':
        errorMessage = '유효하지 않은 이메일 형식입니다'
        break
      case 'auth/user-disabled':
        errorMessage = '비활성화된 계정입니다'
        break
      case 'auth/user-not-found':
        errorMessage = '등록되지 않은 이메일입니다'
        break
      case 'auth/wrong-password':
        errorMessage = '잘못된 비밀번호입니다'
        break
      default:
        errorMessage = '로그인 중 오류가 발생했습니다'
    }
    
    return { 
      success: false, 
      error: errorMessage 
    }
  }
}

