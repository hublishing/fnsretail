'use client'

import { DynamicTable } from '../components/dynamic-table'
import type { DataType, ColumnConfig } from '../components/dynamic-table'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"
import { useState, useEffect } from "react"
import { queryProducts } from "@/lib/bigquery"

// 컬럼 설정
const columns: ColumnConfig[] = [
  {
    key: "product_id",
    label: "상품 ID",
    type: "number" as DataType,
  },
  {
    key: "options_product_id",
    label: "품목상품코드",
    type: "string" as DataType,
  },
  {
    key: "name",
    label: "상품명",
    type: "string" as DataType,
  },
  {
    key: "options_options",
    label: "옵션",
    type: "string" as DataType,
  },
  {
    key: "org_price",
    label: "원가",
    type: "number" as DataType,
    format: (value: number) => `${value.toLocaleString()}원`,
  },
  {
    key: "shop_price",
    label: "판매가",
    type: "number" as DataType,
    format: (value: number) => `${value.toLocaleString()}원`,
  },
  {
    key: "category",
    label: "카테고리",
    type: "string" as DataType,
  }, 
]

export default function DynamicTablePage() {
  const [data, setData] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)

  const fetchData = async (search?: string) => {
    try {
      setLoading(true)
      const products = await queryProducts(search)
      setData(products)
    } catch (error) {
      console.error('데이터 로딩 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSearch = () => {
    fetchData(searchTerm)
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">상품 목록</h1>
        
        {/* 검색 영역 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="상품명을 입력하세요"
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? '검색 중...' : '검색'}
            </Button>
          </div>
        </div>

        {/* 데이터 표시 영역 */}
        <div className="bg-white rounded-lg shadow-sm">
          <DynamicTable data={data} columns={columns} />
        </div>
      </div>
    </div>
  )
} 