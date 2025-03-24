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
  name: string
  origin: string
  weight: string
  org_price: number
  shop_price: number
  img_desc1: string
  product_desc: string
  category: string
  extra_column1: string
  extra_column2: string
  options_product_id: string
  options_options: string
}

interface Column {
  key: keyof Product;
  label: string;
  format?: (value: any) => React.ReactNode;
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
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || '데이터를 불러오는데 실패했습니다.')
      }

      if (!Array.isArray(result)) {
        throw new Error('잘못된 데이터 형식입니다.')
      }

      setData(result)
    } catch (err) {
      console.error('데이터 로딩 오류:', err)
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
      setData([])
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

  const columns: Column[] = [
    { 
      key: "img_desc1", 
      label: "상품이미지",
      format: (value: string) => value ? (
        <div className="relative w-20 h-20">
          <img 
            src={value} 
            alt="상품 이미지" 
            className="w-20 h-20 object-contain"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.parentElement?.classList.add('flex', 'items-center', 'justify-center', 'bg-gray-100');
              target.parentElement!.innerHTML = '이미지 없음';
            }}
            onLoad={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'block';
            }}
          />
        </div>
      ) : '이미지 없음'
    },
    { key: "name", label: "이지어드민상품명" },
    { key: "product_id", label: "이지어드민상품코드" },
    { key: "org_price", label: "원가", format: (value: number) => `${value.toLocaleString()}원` },
    { key: "shop_price", label: "판매가", format: (value: number) => `${value.toLocaleString()}원` },
    { 
      key: "product_desc", 
      label: "상품URL(자사)",
      format: (value: string) => value ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
          링크
        </a>
      ) : '링크 없음'
    },
    { key: "category", label: "카테고리" },
    { key: "extra_column1", label: "영문상품명" },
    { key: "extra_column2", label: "출시시즌" },
    { key: "options_product_id", label: "이지어드민옵션코드" },
    { key: "options_options", label: "이지어드민옵션명" },
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
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? '검색 중...' : '검색'}
        </Button>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md mb-4">
          {error}
        </div>
      )}

      <div className="rounded-md border overflow-x-auto">
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