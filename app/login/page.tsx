'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoginForm } from '../components/login-form'
import { login } from '../actions/auth'
import type { LoginResult } from '../actions/auth'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (formData: FormData) => {
    try {
      setError(null)
      const result = await login({ success: false, error: '' }, formData)
      
      if (result.success) {
        router.push('/dynamic-table')
      } else {
        setError(result.error || '로그인에 실패했습니다.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인 처리 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <LoginForm formAction={handleSubmit} error={error} />
    </div>
  )
}

