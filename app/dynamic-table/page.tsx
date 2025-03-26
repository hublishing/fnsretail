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
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { getSession } from '@/app/actions/auth';
import { useRouter } from "next/navigation"
import { ProductDetailModal } from "@/components/product-detail-modal"

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
  total_stock: number
  drop_yn: string
  soldout_rate: number
  supply_name: string
  exclusive2: string
  detail?: never
  options_product_id: string
  brand?: string
  line?: string
  season?: string
  total_order_qty?: number
  recent_order_dates?: string[]
  order_countries?: string[]
  order_channels?: string[]
  order_categories?: string[]
  order_types?: string[]
}

interface Column {
  key: keyof Product | 'actions' | 'detail';
  label: string;
  format?: (value: any, product?: Product) => React.ReactNode;
  sortable?: boolean;
}

type SearchType = 'name' | 'product_id';

export default function DynamicTable() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [searchType, setSearchType] = useState<SearchType>('name')
  const [error, setError] = useState<string | null>(null)
  const [cartItems, setCartItems] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState({
    extra_column2: 'all',
    category_3: 'all',
    drop_yn: 'all',
    supply_name: 'all',
    exclusive2: 'all',
    code30: 'all',
    channel_name: 'all',
    channel_category_2: 'all',
    channel_category_3: 'all',
    order_date_from: '',
    order_date_to: '',
    sort_by_qty: 'desc'
  })

  // 동적 필터 옵션
  const [dynamicFilterOptions, setDynamicFilterOptions] = useState({
    supply_name: new Set<string>(),
    extra_column2: new Set<string>(),
    exclusive2: new Set<string>(),
    code30: new Set<string>(),  // 주문 국가
    channel_name: new Set<string>(),  // 채널명
    channel_category_2: new Set<string>(),  // 구분
    channel_category_3: new Set<string>()  // 분류
  })

  const router = useRouter()
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // 컬럼 정의를 상수로 분리
  const columns: Column[] = [
    { key: 'actions', label: '담기' },
    { key: "product_id", label: "이지어드민" },
    { 
      key: "img_desc1", 
      label: "상품이미지",
      format: (value: string) => value ? (
        <div className="flex justify-center">
          <img 
            src={value} 
            alt="상품 이미지" 
            className="w-20 h-20 object-cover rounded-md"
            style={{ borderRadius: '5px' }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.backgroundColor = '#e5e7eb'; // gray-200
              target.style.display = 'block';
              target.style.objectFit = 'none';
              target.removeAttribute('src');
              target.alt = '';
            }}
          />
        </div>
      ) : (
        <div className="flex justify-center">
          <div 
            className="w-20 h-20 bg-gray-200 rounded-md flex items-center justify-center"
            style={{ borderRadius: '5px' }}
          >
            <span className="text-gray-400 text-xs">이미지 없음</span>
          </div>
        </div>
      )
    },
    { 
      key: 'name',
      label: '상품명',
      sortable: true,
      format: (value: string, product: any) => (
        <button
          onClick={() => {
            console.log('상품명 클릭:', {
              productName: value,
              productId: product.product_id,
              optionsProductId: product.options_product_id
            });
            setSelectedProductId(product.product_id);
          }}
          className="text-left hover:text-blue-600 transition-colors w-full"
        >
          <div className="font-medium">{value}</div>
          <div className="text-sm text-gray-500 mt-1">
            {[
              product.brand,
              product.category_1,
              product.extra_column2
            ].filter(Boolean).join(' ')}
          </div>
        </button>
      ),
    },
    { key: "org_price", label: "원가", format: (value: number) => (value !== undefined && value !== null) ? value.toLocaleString() : '-' },
    { key: "shop_price", label: "판매가", format: (value: number) => (value !== undefined && value !== null) ? value.toLocaleString() : '-' },
    { key: "category_3", label: "카테고리" },
    { key: "cost_ratio", label: "원가율", format: (value: number) => (value !== undefined && value !== null) ? `${value}%` : '-' },
    { 
      key: "total_stock", 
      label: "재고", 
      format: (value: number) => {
        if (value === undefined || value === null) return '-';
        return value.toLocaleString();
      }
    },
    { key: "soldout_rate", label: "품절률", format: (value: number) => (value !== undefined && value !== null) ? `${value}%` : '-' },
    { key: "drop_yn", label: "드랍여부" },
    { key: "supply_name", label: "공급처명" },
    { key: "exclusive2", label: "단독여부" },
    { 
      key: "total_order_qty", 
      label: "판매수량", 
      format: (value: number) => {
        if (value === undefined || value === null) return '-';
        return value.toLocaleString();
      }
    },
    { 
      key: "product_desc", 
      label: "URL",
      format: (value: string) => value ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
          링크
        </a>
      ) : '링크 없음'
    }
  ];

  // 초기화 함수
  const resetState = async () => {
    try {
      if (user) {
        // Firestore에서 사용자의 검색 상태 삭제
        const docRef = doc(db, 'userSearchStates', user.uid);
        await setDoc(docRef, {
          searchTerm: '',
          searchType: 'name',
          filters: {
            extra_column2: 'all',
            category_3: 'all',
            drop_yn: 'all',
            supply_name: 'all',
            exclusive2: 'all',
            code30: 'all',
            channel_name: 'all',
            channel_category_2: 'all',
            channel_category_3: 'all',
            order_date_from: '',
            order_date_to: '',
            sort_by_qty: 'desc'
          },
          searchResults: [],
          updatedAt: new Date().toISOString()
        });
      }
      
      // 상태 초기화
      setData([]);
      setSearchTerm("");
      setSearchType('name');
      setFilters({
        extra_column2: 'all',
        category_3: 'all',
        drop_yn: 'all',
        supply_name: 'all',
        exclusive2: 'all',
        code30: 'all',
        channel_name: 'all',
        channel_category_2: 'all',
        channel_category_3: 'all',
        order_date_from: '',
        order_date_to: '',
        sort_by_qty: 'desc'
      });

      // 컬럼 상태는 변경하지 않습니다 - 컬럼 정의는 columns 변수에 정의되어 있으며 이 함수에서는 수정하지 않습니다.
    } catch (error) {
      console.error('상태 초기화 오류:', error);
    }
  };

  // 사용자 세션 로드
  useEffect(() => {
    const loadSession = async () => {
      try {
        const session = await getSession();
        console.log('세션 로드 결과:', session);
        if (session) {
          setUser(session);
          console.log('사용자 세션 설정 완료:', {
            uid: session.uid,
            email: session.email
          });
        } else {
          console.log('세션이 없습니다.');
          await resetState();
        }
      } catch (error) {
        console.error('세션 로드 오류:', error);
        await resetState();
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, []);

  // 저장된 검색 상태 불러오기
  useEffect(() => {
    const loadSearchState = async () => {
      if (!user) {
        console.log('사용자가 로그인되지 않았습니다.');
        return;
      }
      
      try {
        console.log('검색 상태 불러오기 시작:', {
          userId: user.uid,
          userEmail: user.email
        });
        
        const docRef = doc(db, 'userSearchStates', user.uid);
        console.log('문서 참조 생성:', docRef.path);
        
        const docSnap = await getDoc(docRef);
        console.log('문서 존재 여부:', docSnap.exists());
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log('저장된 데이터:', data);
          setSearchTerm(data.searchTerm || '');
          setSearchType(data.searchType || 'name');
          setFilters(data.filters || {
            extra_column2: 'all',
            category_3: 'all',
            drop_yn: 'all',
            supply_name: 'all',
            exclusive2: 'all',
            code30: 'all',
            channel_name: 'all',
            channel_category_2: 'all',
            channel_category_3: 'all',
            order_date_from: '',
            order_date_to: '',
            sort_by_qty: 'desc'
          });
          if (data.searchResults) {
            // 저장된 검색 결과를 불러올 때 필요한 필드가 없으면 기본값 추가
            const processedResults = data.searchResults.map((item: any) => ({
              ...item,
              total_stock: item.total_stock || 0, // total_stock이 없는 경우 기본값 설정
            }));
            setData(processedResults);
          }
        } else {
          console.log('저장된 데이터가 없습니다.');
        }
      } catch (error: any) {
        console.error('검색 상태 불러오기 실패:', error);
        console.error('오류 상세:', {
          message: error.message,
          code: error.code,
          stack: error.stack
        });
      }
    };

    if (!loading) {
      loadSearchState();
    }
  }, [user, loading]);

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
          exclusive2: new Set(result.exclusive2 || []),
          code30: new Set(result.code30 || []),
          channel_name: new Set(result.channel_name || []),
          channel_category_2: new Set(result.channel_category_2 || []),
          channel_category_3: new Set(result.channel_category_3 || [])
        });
      } catch (err) {
        console.error('필터 옵션 로딩 오류:', err);
      }
    };

    loadFilterOptions();
  }, []);

  // 장바구니 데이터 로드
  useEffect(() => {
    const loadCartItems = async () => {
      if (!user) return;
      
      try {
        const docRef = doc(db, 'userCarts', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          const products = data.products || [];
          setCartItems(new Set(products.map((p: Product) => p.product_id)));
        }
      } catch (error) {
        console.error('장바구니 데이터 로드 오류:', error);
      }
    };

    loadCartItems();
  }, [user]);

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
        if ((value !== 'all' && value !== '') || key === 'sort_by_qty') {
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

      // total_stock 필드가 없는 경우 기본값 설정 (API 응답에 누락된 경우)
      const processedResults = result.map((item: any) => ({
        ...item,
        total_stock: item.total_stock !== undefined ? item.total_stock : 0,
      }));
      
      setData(processedResults);
      
      // 검색 결과 저장
      if (user) {
        try {
          console.log('검색 결과 저장 시도:', {
            userId: user.uid,
            searchTerm,
            searchType,
            filters,
            resultCount: processedResults.length
          });
          
          const docRef = doc(db, 'userSearchStates', user.uid);
          const searchState = {
            searchTerm,
            searchType,
            filters,
            searchResults: processedResults,
            updatedAt: new Date().toISOString()
          };
          
          await setDoc(docRef, searchState, { merge: true });
          console.log('검색 결과 저장 완료');
        } catch (error) {
          console.error('검색 결과 저장 실패:', error);
          // 저장 실패해도 검색 결과는 표시
        }
      } else {
        console.log('사용자가 로그인되지 않아 저장하지 않습니다.');
      }
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
    // 값이 undefined일 경우 빈 문자열로 대체
    const safeValue = value === undefined ? '' : value;
    setFilters(prev => ({ ...prev, [key]: safeValue }));
  }

  // 날짜 필드 핸들러 - 항상 문자열 반환 보장
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'order_date_from' | 'order_date_to') => {
    const value = e.target.value || ''; // undefined나 null이면 빈 문자열로
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  // 날짜 퀵 선택 버튼 핸들러
  const handleQuickDateSelect = (period: 'week' | 'month' | 'all') => {
    const today = new Date();
    const endDate = today.toISOString().split('T')[0]; // 오늘 날짜 YYYY-MM-DD 형식
    
    let startDate = '';
    
    if (period === 'week') {
      // 일주일 전
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      startDate = weekAgo.toISOString().split('T')[0];
    } else if (period === 'month') {
      // 한달 전
      const monthAgo = new Date(today);
      monthAgo.setMonth(today.getMonth() - 1);
      startDate = monthAgo.toISOString().split('T')[0];
    }
    // 'all'인 경우 startDate는 빈 문자열로 남겨둠
    
    setFilters(prev => ({ 
      ...prev, 
      order_date_from: startDate,
      order_date_to: period === 'all' ? '' : endDate 
    }));
  };

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

  // 장바구니에서 상품 제거
  const handleRemoveFromCart = async (product: Product) => {
    try {
      if (!user) return;

      const docRef = doc(db, 'userCarts', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const products = data.products || [];
        const updatedProducts = products.filter((p: Product) => p.product_id !== product.product_id);
        
        await setDoc(docRef, {
          products: updatedProducts,
          updatedAt: new Date().toISOString()
        });

        setCartItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(product.product_id);
          return newSet;
        });

        alert('장바구니에서 제거되었습니다.');
      }
    } catch (error) {
      console.error('장바구니 제거 오류:', error);
      alert('장바구니에서 제거하는 중 오류가 발생했습니다.');
    }
  };

  // 담기 기능 수정
  const handleAddToCart = async (product: Product) => {
    try {
      if (!user) {
        alert('장바구니에 담으려면 로그인이 필요합니다.');
        return;
      }

      const docRef = doc(db, 'userCarts', user.uid);
      const docSnap = await getDoc(docRef);
      
      let currentProducts: Product[] = [];
      if (docSnap.exists()) {
        const data = docSnap.data();
        currentProducts = data.products || [];
      }

      // 이미 장바구니에 있는 상품인지 확인
      if (currentProducts.some(p => p.product_id === product.product_id)) {
        alert('이미 장바구니에 담긴 상품입니다.');
        return;
      }

      // 상품 추가 - total_stock 정보 포함
      const productWithStock = {
        ...product,
        total_stock: product.total_stock || 0 // total_stock이 없는 경우 기본값 설정
      };
      
      currentProducts.push(productWithStock);
      
      // Firestore 업데이트
      await setDoc(docRef, {
        products: currentProducts,
        updatedAt: new Date().toISOString()
      });

      // 로컬 상태 업데이트
      setCartItems(prev => new Set([...prev, product.product_id]));

      alert('장바구니에 담았습니다.');
    } catch (error) {
      console.error('장바구니 담기 오류:', error);
      alert('장바구니에 담는 중 오류가 발생했습니다.');
    }
  };

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
          <div className="flex items-center gap-4">
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? '검색 중...' : '검색'}
            </Button>
            <Button 
              onClick={resetState} 
              variant="outline"
              className="border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-gray-100"
            >
              초기화
            </Button>
          </div>
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

        {/* 주문 관련 필터 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-500">주문기간:</div>
            <Input
              type="date"
              value={filters.order_date_from || ''}
              onChange={(e) => handleDateChange(e, 'order_date_from')}
              className="w-40"
            />
            <span>-</span>
            <Input
              type="date"
              value={filters.order_date_to || ''}
              onChange={(e) => handleDateChange(e, 'order_date_to')}
              className="w-40"
            />
            <div className="flex gap-1 ml-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleQuickDateSelect('week')}
                className="px-2 h-8 text-xs"
              >
                일주일
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleQuickDateSelect('month')}
                className="px-2 h-8 text-xs"
              >
                한달
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleQuickDateSelect('all')}
                className="px-2 h-8 text-xs"
              >
                전체
              </Button>
            </div>
          </div>

          <Select
            value={filters.code30}
            onValueChange={(value) => handleFilterChange('code30', value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="주문국가" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 국가</SelectItem>
              {Array.from(dynamicFilterOptions.code30).map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.channel_name}
            onValueChange={(value) => handleFilterChange('channel_name', value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="채널명" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 채널</SelectItem>
              {Array.from(dynamicFilterOptions.channel_name).map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-4">
          <Select
            value={filters.channel_category_2}
            onValueChange={(value) => handleFilterChange('channel_category_2', value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="구분" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 구분</SelectItem>
              {Array.from(dynamicFilterOptions.channel_category_2).map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.channel_category_3}
            onValueChange={(value) => handleFilterChange('channel_category_3', value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="분류" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 분류</SelectItem>
              {Array.from(dynamicFilterOptions.channel_category_3).map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.sort_by_qty}
            onValueChange={(value) => handleFilterChange('sort_by_qty', value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="판매수량 정렬" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">기본 정렬</SelectItem>
              <SelectItem value="desc">판매 많은 순</SelectItem>
              <SelectItem value="asc">판매 적은 순</SelectItem>
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
                <TableHead key={column.key} className="text-center">{column.label}</TableHead>
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
                    <TableCell key={column.key} className="text-center">
                      {column.key === 'actions' ? (
                        cartItems.has(item.product_id) ? (
                          <button
                            onClick={() => handleRemoveFromCart(item)}
                            className="w-8 h-8 flex items-center justify-center bg-white text-red-500 border border-red-500 hover:bg-red-50 transition-colors rounded-[5px] mx-auto"
                          >
                            -
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAddToCart(item)}
                            className="w-8 h-8 flex items-center justify-center bg-white text-blue-500 border border-blue-500 hover:bg-blue-50 transition-colors rounded-[5px] mx-auto"
                          >
                            +
                          </button>
                        )
                      ) : column.format ? (
                        column.format(item[column.key as keyof Product], item)
                      ) : (
                        item[column.key as keyof Product]
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedProductId && (
        <ProductDetailModal
          productId={selectedProductId}
          onClose={() => setSelectedProductId(null)}
        />
      )}
    </div>
  )
} 