'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSession } from './actions/auth'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getSession()
      if (!session) {
        router.push('/login')
      }
    }
    checkAuth()
  }, [router])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">FNS Retail</h1>
      <p className="mt-4">환영합니다!</p>
    </div>
  )
}

