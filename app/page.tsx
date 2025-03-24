'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoginForm } from './components/login-form'
import { signInWithGoogle } from './actions/auth'

export default function LoginPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <LoginForm formAction={signInWithGoogle} error={null} />
    </div>
  )
}

