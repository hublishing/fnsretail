'use client'

import type { ReactElement } from 'react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoginForm } from '../components/login-form'
import { useFormState } from 'react-dom'
import { login } from '../actions/auth'
import type { LoginResult } from '../actions/auth'

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <LoginForm formAction={formAction} error={state.error} />
    </div>
  )
}

