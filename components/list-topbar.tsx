'use client'

import { usePathname, useRouter } from "next/navigation"

export function ListTopbar() {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div className="mx-auto pb-5">
        <div className=" py-5 px-5 flex bg-card rounded-lg shadow-sm">
            <div
                onClick={() => router.push('/page/list/create')}
            className={`pr-8 cursor-pointer text-s ${
                pathname === '/page/list/create' 
                    ? 'text-blue-500 font-bold' 
                    : 'text-gray-500 font-bold'
            }`}
        >
            리스트 작성
        </div>
        <div
            onClick={() => router.push('/page/list/view')}
            className={`pr-8 cursor-pointer text-s ${
                pathname === '/page/list/view' 
                    ? 'text-blue-500 font-bold' 
                    : 'text-gray-500 font-bold'
            }`}
        >
            리스트 조회
        </div>
        <div
            onClick={() => router.push('/page/list/edit')}
            className={`pr-8 cursor-pointer text-s ${
                pathname === '/page/list/edit' 
                    ? 'text-blue-500 font-bold' 
                    : 'text-gray-500 font-bold'
            }`}
        >
            리스트 편집
        </div>
        </div>
    </div>
  )
} 