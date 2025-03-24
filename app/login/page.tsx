'use client'

import { LoginForm } from '../components/login-form'
import { signInWithGoogle } from '../actions/auth'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <LoginForm formAction={signInWithGoogle} error={null} />
    </div>
  )
}

