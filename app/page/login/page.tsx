'use client'

import type { ReactElement } from 'react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoginForm } from '@/app/components/login-form'
import { useFormState } from 'react-dom'
import { login } from '@/app/actions/auth'
import type { LoginResult } from '@/app/actions/auth'

const initialState: LoginResult = {
  success: false,
  error: ''
}

export default function LoginPage(): ReactElement {
  const router = useRouter()
  const [state, formAction] = useFormState<LoginResult, FormData>(login, initialState)

  useEffect(() => {
    if (state.success) {
      router.push('/')
    }
  }, [state.success, router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoginForm formAction={formAction} error={state.error} />
    </div>
  )
}

