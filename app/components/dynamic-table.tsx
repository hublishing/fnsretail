'use client'

import { useState, useEffect } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useDebounce } from '@/hooks/use-debounce'

interface Product {
  product_id: string
  name: string
  org_price: number
  shop_price: number
  category: string
}

interface PaginatedResponse {
  items: Product[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

interface ApiError {
  error: string
}

export function DynamicTable() {
  const [searchTerm, setSearchTerm] = useState('')
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
  const pageSize = 50
  const debouncedSearchTerm = useDebounce(searchTerm, 500)

  useEffect(() => {
    const fetchProducts = async () => {
      if (!debouncedSearchTerm) {
        setAllProducts([])
        setTotalPages(0)
        setTotalItems(0)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/products?search=${encodeURIComponent(debouncedSearchTerm)}`)
        
        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(errorText || '데이터를 불러오는데 실패했습니다.')
        }

        const data = await response.json()
        const paginatedData = data as PaginatedResponse
        setAllProducts(paginatedData.items)
        setTotalPages(paginatedData.totalPages)
        setTotalItems(paginatedData.total)
      } catch (err) {
        console.error('데이터 로드 오류:', err)
        setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [debouncedSearchTerm])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1) // 검색어가 변경되면 첫 페이지로 이동
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  // 현재 페이지의 데이터만 표시
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const currentPageProducts = allProducts.slice(startIndex, endIndex)

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Input
          placeholder="상품명으로 검색..."
          value={searchTerm}
          onChange={handleSearch}
          className="max-w-sm"
        />
      </div>

      {error && (
        <div className="text-red-500 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div>로딩 중...</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상품코드
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상품명
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    원가
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    판매가
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    카테고리
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentPageProducts.map((product, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.product_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.org_price.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.shop_price.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.category}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                총 {totalItems}개 중 {startIndex + 1}~{Math.min(endIndex, totalItems)}개 표시
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  이전
                </Button>
                <div className="text-sm">
                  {currentPage} / {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  다음
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
} 