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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// 고정 필터 옵션
const STATIC_FILTER_OPTIONS = {
  drop_yn: [
    { value: 'DROP', label: '드랍' }
  ],
  extra_column2: [
    { value: '23SS', label: '23SS' },
    { value: '23FW', label: '23FW' },
    { value: '24SS', label: '24SS' }
  ],
  category_3: [
    { value: '힐', label: '힐' },
    { value: '플랫', label: '플랫' },
    { value: '슬링백힐', label: '슬링백힐' },
    { value: '샌들힐', label: '샌들힐' },
    { value: '쪼리/슬리퍼', label: '쪼리/슬리퍼' },
    { value: '샌들', label: '샌들' },
    { value: '샌들뮬', label: '샌들뮬' },
    { value: '로퍼', label: '로퍼' },
    { value: '앵클부츠', label: '앵클부츠' },
    { value: '힐뮬', label: '힐뮬' }
  ]
};

interface Product {
  product_id: string
  name: string
  org_price: number
  shop_price: number
  img_desc1: string
  product_desc: string
  extra_column2: string
  cost_ratio: number
  category_1: string
  category_3: string
  main_wh_available_stock_excl_production_stock: number
  drop_yn: string
  soldout_rate: number
  supply_name: string
  exclusive2: string
}

interface Column {
  key: keyof Product;
  label: string;
  format?: (value: any) => React.ReactNode;
}

type SearchType = 'name' | 'product_id';

export default function DynamicTable() {
  const [data, setData] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [searchType, setSearchType] = useState<SearchType>('name')
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    extra_column2: 'all',
    category_3: 'all',
    drop_yn: 'all',
    supply_name: 'all',
    exclusive2: 'all'
  })

  // 동적 필터 옵션
  const [dynamicFilterOptions, setDynamicFilterOptions] = useState({
    supply_name: new Set<string>(),
    extra_column2: new Set<string>(),
    exclusive2: new Set<string>()
  })

  // 필터 옵션 초기화
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const response = await fetch('/api/filter-options');
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || '필터 옵션을 불러오는데 실패했습니다.');
        }

        setDynamicFilterOptions({
          supply_name: new Set(result.supply_name || []),
          extra_column2: new Set(result.extra_column2 || []),
          exclusive2: new Set(result.exclusive2 || [])
        });
      } catch (err) {
        console.error('필터 옵션 로딩 오류:', err);
      }
    };

    loadFilterOptions();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // URL 파라미터 생성
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      params.append('type', searchType);
      
      // 'all'이 아닌 필터만 추가
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== 'all') {
          params.append(key, value);
        }
      });

      const response = await fetch(`/api/products?${params.toString()}`)
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

  // 필터 변경 핸들러
  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleSearch = () => {
    // 검색어나 필터 중 하나라도 있는 경우에만 검색 실행
    const hasSearchTerm = searchTerm.trim().length > 0;
    const hasFilter = Object.values(filters).some(value => value !== 'all');

    if (!hasSearchTerm && !hasFilter) {
      setError('검색어를 입력하거나 필터를 선택해주세요.');
      return;
    }

    fetchData();
  }

  const getPlaceholder = () => {
    return searchType === 'name' 
      ? "상품명을 입력하세요" 
      : "상품코드를 입력하세요 (여러 개인 경우 쉼표로 구분)"
  }

  const columns: Column[] = [
    { key: "product_id", label: "이지어드민" },
    { 
      key: "img_desc1", 
      label: "상품이미지",
      format: (value: string) => value ? (
        <img 
          src={value} 
          alt="상품 이미지" 
          className="w-24 h-24 object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/no-image.png';
          }}
        />
      ) : (
        <img 
          src="/no-image.png" 
          alt="이미지 없음" 
          className="w-24 h-24 object-cover"
        />
      )
    },
    { key: "name", label: "이지어드민상품명" },
    { key: "org_price", label: "원가", format: (value: number) => value.toLocaleString() },
    { key: "shop_price", label: "판매가", format: (value: number) => value.toLocaleString() },
    { 
      key: "product_desc", 
      label: "URL",
      format: (value: string) => value ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
          링크
        </a>
      ) : '링크 없음'
    },
    { key: "category_1", label: "라인" },
    { key: "category_3", label: "카테고리" },
    { key: "extra_column2", label: "출시시즌" },
    { key: "cost_ratio", label: "원가율", format: (value: number) => `${value}%` },
    { key: "main_wh_available_stock_excl_production_stock", label: "재고", format: (value: number) => value.toLocaleString() },
    { key: "drop_yn", label: "드랍여부" },
    { key: "soldout_rate", label: "품절률", format: (value: number) => `${value}%` },
    { key: "supply_name", label: "공급처명" },
    { key: "exclusive2", label: "단독여부" }
  ]

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Select
            value={searchType}
            onValueChange={(value: SearchType) => setSearchType(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="검색 유형 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">상품명</SelectItem>
              <SelectItem value="product_id">상품코드</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
            <Input
              placeholder={getPlaceholder()}
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

        <div className="flex items-center gap-4">
          <Select
            value={filters.category_3}
            onValueChange={(value) => handleFilterChange('category_3', value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="카테고리" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">카테고리</SelectItem>
              {STATIC_FILTER_OPTIONS.category_3.map(({ value, label }) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.extra_column2}
            onValueChange={(value) => handleFilterChange('extra_column2', value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="출시시즌" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">시즌</SelectItem>
              {Array.from(dynamicFilterOptions.extra_column2).map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.drop_yn}
            onValueChange={(value) => handleFilterChange('drop_yn', value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="드랍여부" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">드랍상태</SelectItem>
              {STATIC_FILTER_OPTIONS.drop_yn.map(({ value, label }) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.supply_name}
            onValueChange={(value) => handleFilterChange('supply_name', value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="공급처명" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">공급처</SelectItem>
              {Array.from(dynamicFilterOptions.supply_name).map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.exclusive2}
            onValueChange={(value) => handleFilterChange('exclusive2', value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="단독여부" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">단독상태</SelectItem>
              {Array.from(dynamicFilterOptions.exclusive2).map((option) => (
                <SelectItem key={option} value={option}>
                  {option === 'Y' ? '단독' : option === 'N' ? '단독아님' : option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
                  검색어를 입력하거나 필터를 선택하여 검색해주세요.
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