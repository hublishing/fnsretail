'use client'

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface LoginFormProps {
  formAction: (formData: FormData) => void
  error: string | null
}

export function LoginForm({ formAction, error }: LoginFormProps) {
  return (
    <div className="w-full max-w-sm p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center mb-6">로그인</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="username" className="text-sm font-medium">
            아이디
          </label>
          <Input
            id="username"
            name="username"
            type="text"
            placeholder="아이디를 입력하세요"
            required
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            비밀번호
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="비밀번호를 입력하세요"
            required
          />
        </div>
        <Button type="submit" className="w-full">
          로그인
        </Button>
      </form>
    </div>
  )
}

