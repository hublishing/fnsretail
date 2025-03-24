'use client'

import { useState, useEffect } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"

interface Product {
  product_id: string
  options_product_id: string
  name: string
  options_options: string
  org_price: number
  shop_price: number
  category: string
}

export default function DynamicTable() {
  const [data, setData] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/products?search=${encodeURIComponent(searchTerm)}`)
      if (!response.ok) {
        throw new Error('데이터를 불러오는데 실패했습니다.')
      }
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSearch = () => {
    fetchData()
  }

  const columns = [
    { key: "product_id", label: "상품 ID" },
    { key: "options_product_id", label: "품목상품코드" },
    { key: "name", label: "상품명" },
    { key: "options_options", label: "옵션" },
    { key: "org_price", label: "원가", format: (value: number) => `${value.toLocaleString()}원` },
    { key: "shop_price", label: "판매가", format: (value: number) => `${value.toLocaleString()}원` },
    { key: "category", label: "카테고리" },
  ]

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
          <Input
            placeholder="상품명을 입력하세요"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch()
              }
            }}
          />
        </div>
        <Button onClick={handleSearch}>검색</Button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-md mb-4">
          {error}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key}>{column.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center">
                  데이터를 불러오는 중...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center">
                  데이터가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.product_id}>
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      {column.format 
                        ? column.format(item[column.key as keyof Product] as number)
                        : item[column.key as keyof Product]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
} 