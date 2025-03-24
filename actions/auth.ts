'use server'

import { redirect } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { signInWithEmailAndPassword } from 'firebase/auth'

export async function login(prevState: any, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: '이메일과 비밀번호를 입력해주세요' }
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    const user = userCredential.user
    
    // 로그인 성공 시 대시보드로 리다이렉트
    redirect('/dashboard')
  } catch (error: any) {
    console.error('로그인 오류:', error)
    return { error: '이메일 또는 비밀번호가 올바르지 않습니다' }
  }
}

