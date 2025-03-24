'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoginForm } from './components/login-form'
import { useActionState } from 'react'
import { login } from './actions/auth'
import type { LoginResult } from './actions/auth'

export default function LoginPage() {
  const router = useRouter()
  const [state, formAction] = useActionState<LoginResult, FormData>(login, { success: false, error: '' })

  useEffect(() => {
    if (state.success) {
      router.push('/dynamic-table')
    }
  }, [state.success, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <LoginForm formAction={formAction} error={state.error} />
    </div>
  )
}

