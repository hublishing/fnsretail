'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoginForm } from '../components/login-form'
import { login } from '../actions/auth'
import type { LoginResult } from '../actions/auth'

export default function LoginPage() {
  const router = useRouter()

  const handleSubmit = async (formData: FormData) => {
    const result = await login({ success: false, error: '' }, formData)
    if (result.success) {
      router.push('/dynamic-table')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <LoginForm formAction={handleSubmit} />
    </div>
  )
}

