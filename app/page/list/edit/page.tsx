"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { ListTopbar } from "@/components/list-topbar"
import { Card } from "@/components/ui/card"

export default function ListViewPage() {
  return (
    <div>
        <AppSidebar/>
        <ListTopbar/>
        <div className="container mx-auto py-5">
            <div className="flex justify-between items-center mb-6">
                <div className="flex flex-col">
                    <h1 className="text-2xl font-bold">리스트 편집</h1>
                </div>
            </div>

            <div className="flex-1">
                <Card className="bg-card rounded-lg shadow">
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b">
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">번호</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상품명</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">가격</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">1</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">샘플 상품 1</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">10,000원</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">판매중</td>
                            </tr>
                            <tr className="border-b">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">2</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">샘플 상품 2</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">20,000원</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">판매중</td>
                            </tr>
                        </tbody>
                    </table>
                </Card>
            </div>
        </div>
    </div>
)
}
