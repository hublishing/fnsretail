'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSession } from './actions/auth'

export default function HomePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await getSession()
        if (session) {
          router.push('/page/dashboard/revenue')
        } else {
          router.push('/page/login')
        }
      } catch (error) {
        console.error('인증 확인 오류:', error)
        router.push('/page/login')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (isLoading) {
    return null
  }

  return null
}

