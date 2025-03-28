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

// 필터 초기 상태를 상수로 정의
const INITIAL_FILTERS = {
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
};

// 정렬 함수 추가
const sortData = (data: Product[], sortType: string) => {
  return [...data].sort((a, b) => {
    switch (sortType) {
      case 'stock_desc':
        return (b.total_stock || 0) - (a.total_stock || 0);
      case 'stock_asc':
        return (a.total_stock || 0) - (b.total_stock || 0);
      case 'asc':
        return (a.total_order_qty || 0) - (b.total_order_qty || 0);
      case 'desc':
        return (b.total_order_qty || 0) - (a.total_order_qty || 0);
      default:
        return 0;
    }
  });
};

// 검색 상태 불러오기 함수
const loadSearchState = async (user: any, setSearchTerm: (term: string) => void, setSearchType: (type: SearchType) => void, setFilters: (filters: any) => void, setData: (data: Product[]) => void) => {
  if (!user) {
    console.log('사용자가 로그인되지 않았습니다.');
    return;
  }
  
  try {
    const docRef = doc(db, 'userSearchStates', user.uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      setSearchTerm(data.searchTerm || '');
      setSearchType(data.searchType || 'name');
      setFilters(data.filters || INITIAL_FILTERS);
      if (data.searchResults) {
        const processedResults = data.searchResults.map((item: any) => ({
          ...item,
          total_stock: item.total_stock || 0,
        }));
        setData(processedResults);
      }
    }
  } catch (error) {
    console.error('검색 상태 불러오기 실패:', error);
  }
};

export default function DynamicTable() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [searchType, setSearchType] = useState<SearchType>('name')
  const [error, setError] = useState<string | null>(null)
  const [cartItems, setCartItems] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [isFilterOptionsLoading, setIsFilterOptionsLoading] = useState(true);
  const [filterOptionsError, setFilterOptionsError] = useState<string | null>(null);

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
            className="w-12 h-12 object-cover rounded-md"
            style={{ borderRadius: '5px' }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/no-image.png';
              target.alt = '이미지 없음';
              target.style.objectFit = 'contain';
              target.style.backgroundColor = 'transparent';
              target.parentElement?.classList.add('flex', 'justify-center');
            }}
          />
        </div>
      ) : (
        <div className="flex justify-center">
          <div className="w-12 h-12 flex items-center justify-center">
            <img 
              src="/no-image.png" 
              alt="이미지 없음" 
              className="w-12 h-12 object-contain rounded-md"
              style={{ borderRadius: '5px' }}
            />
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
        const docRef = doc(db, 'userSearchStates', user.uid);
        await setDoc(docRef, {
          searchTerm: '',
          searchType: 'name',
          filters: INITIAL_FILTERS,
          searchResults: [],
          updatedAt: new Date().toISOString()
        });
      }
      
      setData([]);
      setSearchTerm("");
      setSearchType('name');
      setFilters(INITIAL_FILTERS);
      setError(null);
    } catch (error) {
      console.error('상태 초기화 오류:', error);
      setError('상태 초기화 중 오류가 발생했습니다.');
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
    loadSearchState(user, setSearchTerm, setSearchType, setFilters, setData);
  }, [user]);

  // 페이지 포커스 시 검색 상태 다시 불러오기
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        loadSearchState(user, setSearchTerm, setSearchType, setFilters, setData);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user]);

  // 필터 옵션 로딩 함수 수정
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        setIsFilterOptionsLoading(true);
        setFilterOptionsError(null);
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
        setFilterOptionsError(err instanceof Error ? err.message : '필터 옵션을 불러오는데 실패했습니다.');
      } finally {
        setIsFilterOptionsLoading(false);
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

  const fetchData = async (currentFilters = filters) => {
    try {
      if (loading) return;
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      params.append('type', searchType);
      
      // 필터 값 전달 로직 수정
      Object.entries(currentFilters).forEach(([key, value]) => {
        // 빈 값이나 'all'이 아닌 경우에만 파라미터 추가
        if (value && value !== 'all') {
          // 날짜 필드는 빈 문자열 체크 추가
          if ((key === 'order_date_from' || key === 'order_date_to') && value === '') {
            return;
          }
          params.append(key, value);
        }
      });

      const response = await fetch(`/api/products?${params.toString()}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || '데이터를 불러오는데 실패했습니다.');
      }

      if (!Array.isArray(result)) {
        throw new Error('잘못된 데이터 형식입니다.');
      }
      
      const processedResults = result.map((item: any) => ({
        ...item,
        total_stock: item.total_stock !== undefined ? item.total_stock : 0,
      }));
      
      setData(processedResults);
      
      // 검색 결과만 업데이트
      if (user) {
        const docRef = doc(db, 'userSearchStates', user.uid);
        await setDoc(docRef, {
          searchTerm: searchTerm || null,
          searchType: searchType || null,
          filters: currentFilters || null,
          searchResults: processedResults,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('데이터 로딩 오류:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // 필터 변경 핸들러 수정
  const handleFilterChange = async (key: keyof typeof filters, value: string) => {
    try {
      const safeValue = value === undefined ? '' : value;
      const newFilters = { ...filters, [key]: safeValue };
      
      // 필터 상태 업데이트
      setFilters(newFilters);

      // API 호출
      await fetchData(newFilters);

      // Firestore 저장
      if (user) {
        const docRef = doc(db, 'userSearchStates', user.uid);
        await setDoc(docRef, {
          searchTerm,
          searchType,
          filters: newFilters,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('필터 변경 오류:', error);
      // 에러 발생 시 이전 상태로 복구
      setFilters(filters);
    }
  };

  // 날짜 필드 핸들러
  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>, field: 'order_date_from' | 'order_date_to') => {
    console.log('날짜 변경 시작:', { field, value: e.target.value });
    const value = e.target.value || '';
    
    const newFilters = { ...filters, [field]: value };
    console.log('새로운 필터 상태:', newFilters);

    // Firestore 저장 로직을 별도로 처리
    if (user) {
      try {
        const docRef = doc(db, 'userSearchStates', user.uid);
        await setDoc(docRef, {
          searchTerm,
          searchType,
          filters: newFilters,
          updatedAt: new Date().toISOString()
        });
        console.log('Firestore 저장 성공');
      } catch (error) {
        console.error('Firestore 저장 실패:', error);
      }
    }

    // 필터 상태 업데이트
    setFilters(newFilters);
    
    // API 호출
    try {
      console.log('API 호출 시작');
      await fetchData();
      console.log('API 호출 완료');
    } catch (error) {
      console.error('API 호출 실패:', error);
    }
  };

  // 날짜 퀵 선택 버튼 핸들러 수정
  const handleQuickDateSelect = async (period: 'week' | 'month' | 'all') => {
    const today = new Date();
    const endDate = today.toISOString().split('T')[0];
    let startDate = '';
    
    if (period === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      startDate = weekAgo.toISOString().split('T')[0];
    } else if (period === 'month') {
      const monthAgo = new Date(today);
      monthAgo.setMonth(today.getMonth() - 1);
      startDate = monthAgo.toISOString().split('T')[0];
    }
    
    const newFilters = { 
      ...filters, 
      order_date_from: startDate,
      order_date_to: period === 'all' ? '' : endDate 
    };

    // 필터 상태 업데이트
    setFilters(newFilters);
    
    // API 호출
    try {
      await fetchData(newFilters);
    } catch (error) {
      console.error('API 호출 실패:', error);
      // 에러 발생 시 이전 상태로 복구
      setFilters(filters);
    }
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

  // 초기 데이터 로드를 위한 useEffect
  useEffect(() => {
    if (!loading && user) {
      fetchData();
    }
  }, [user]); // user가 변경될 때만 실행

  // 정렬 핸들러 수정
  const handleSortChange = (value: string) => {
    const newFilters = { ...filters, sort_by_qty: value };
    setFilters(newFilters);
    setData(prevData => sortData(prevData, value));
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">상품 검색</h1>
      
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex items-center gap-4">
          <Select
            value={searchType}
            onValueChange={(value: SearchType) => setSearchType(value)}
          >
            <SelectTrigger className="w-[140px] h-10">
              <SelectValue placeholder="검색 유형 선택" />
            </SelectTrigger>
            <SelectContent className="min-w-[140px]">
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
              className="pl-10 h-10"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch()
                }
              }}
            />
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={handleSearch} disabled={loading} className="h-10">
              {loading ? '검색 중...' : '검색'}
            </Button>
            <Button 
              onClick={resetState} 
              variant="outline"
              className="border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-gray-100 h-10"
            >
              초기화
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isFilterOptionsLoading ? (
            <div className="text-sm text-gray-500">필터 옵션을 불러오는 중...</div>
          ) : (
            <>
              <Select
                value={filters.category_3}
                onValueChange={(value) => handleFilterChange('category_3', value)}
              >
                <SelectTrigger className={`w-[140px] ${filters.category_3 !== 'all' ? 'bg-blue-50 border-blue-200' : ''} h-10`}>
                  <SelectValue placeholder="카테고리" />
                </SelectTrigger>
                <SelectContent className="min-w-[140px]">
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
                <SelectTrigger className={`w-[140px] ${filters.extra_column2 !== 'all' ? 'bg-blue-50 border-blue-200' : ''} h-10`}>
                  <SelectValue placeholder="출시시즌" />
                </SelectTrigger>
                <SelectContent className="min-w-[140px]">
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
                <SelectTrigger className={`w-[140px] ${filters.drop_yn !== 'all' ? 'bg-blue-50 border-blue-200' : ''} h-10`}>
                  <SelectValue placeholder="드랍여부" />
                </SelectTrigger>
                <SelectContent className="min-w-[140px]">
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
                <SelectTrigger className={`w-[140px] ${filters.supply_name !== 'all' ? 'bg-blue-50 border-blue-200' : ''} h-10`}>
                  <SelectValue placeholder="공급처명" />
                </SelectTrigger>
                <SelectContent className="min-w-[140px]">
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
                <SelectTrigger className={`w-[140px] ${filters.exclusive2 !== 'all' ? 'bg-blue-50 border-blue-200' : ''} h-10`}>
                  <SelectValue placeholder="단독여부" />
                </SelectTrigger>
                <SelectContent className="min-w-[140px]">
                  <SelectItem value="all">단독상태</SelectItem>
                  {Array.from(dynamicFilterOptions.exclusive2).map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === 'Y' ? '단독' : option === 'N' ? '단독아님' : option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          <Select
            value={filters.code30}
            onValueChange={(value) => handleFilterChange('code30', value)}
          >
            <SelectTrigger className={`w-[140px] ${filters.code30 !== 'all' ? 'bg-blue-50 border-blue-200' : ''} h-10`}>
              <SelectValue placeholder="주문국가" />
            </SelectTrigger>
            <SelectContent className="min-w-[140px]">
              <SelectItem value="all">전체 국가</SelectItem>
              {Array.from(dynamicFilterOptions.code30).map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.channel_category_2}
            onValueChange={(value) => handleFilterChange('channel_category_2', value)}
          >
            <SelectTrigger className={`w-[140px] ${filters.channel_category_2 !== 'all' ? 'bg-blue-50 border-blue-200' : ''} h-10`}>
              <SelectValue placeholder="구분" />
            </SelectTrigger>
            <SelectContent className="min-w-[140px]">
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
            <SelectTrigger className={`w-[140px] ${filters.channel_category_3 !== 'all' ? 'bg-blue-50 border-blue-200' : ''} h-10`}>
              <SelectValue placeholder="분류" />
            </SelectTrigger>
            <SelectContent className="min-w-[140px]">
              <SelectItem value="all">전체 분류</SelectItem>
              {Array.from(dynamicFilterOptions.channel_category_3).map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.channel_name}
            onValueChange={(value) => handleFilterChange('channel_name', value)}
          >
            <SelectTrigger className={`w-[140px] ${filters.channel_name !== 'all' ? 'bg-blue-50 border-blue-200' : ''} h-10`}>
              <SelectValue placeholder="채널명" />
            </SelectTrigger>
            <SelectContent className="min-w-[140px]">
              <SelectItem value="all">전체 채널</SelectItem>
              {Array.from(dynamicFilterOptions.channel_name).map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-500">주문기간:</div>
            <Input
              type="date"
              value={filters.order_date_from || ''}
              onChange={(e) => handleDateChange(e, 'order_date_from')}
              className={`w-40 ${filters.order_date_from ? 'bg-blue-50 border-blue-200' : ''} h-10`}
            />
            <span>-</span>
            <Input
              type="date"
              value={filters.order_date_to || ''}
              onChange={(e) => handleDateChange(e, 'order_date_to')}
              className={`w-40 ${filters.order_date_to ? 'bg-blue-50 border-blue-200' : ''} h-10`}
            />
            <div className="flex gap-1 ml-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleQuickDateSelect('week')}
                className="px-2 h-10 text-xs"
              >
                일주일
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleQuickDateSelect('month')}
                className="px-2 h-10 text-xs"
              >
                한달
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleQuickDateSelect('all')}
                className="px-2 h-10 text-xs"
              >
                전체
              </Button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md mb-2">
          {error}
        </div>
      )}

      {filterOptionsError && (
        <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md mb-2">
          {filterOptionsError}
        </div>
      )}

      <div className="flex justify-end mb-2">
        <Select
          value={filters.sort_by_qty}
          onValueChange={handleSortChange}
        >
          <SelectTrigger className="w-[140px] border-none focus:ring-0 focus:ring-offset-0 shadow-none h-10">
            <SelectValue placeholder="정렬 기준" />
          </SelectTrigger>
          <SelectContent className="min-w-[140px]">
            <SelectItem value="desc">판매 많은 순</SelectItem>
            <SelectItem value="asc">판매 적은 순</SelectItem>
            <SelectItem value="stock_desc">재고 많은 순</SelectItem>
            <SelectItem value="stock_asc">재고 적은 순</SelectItem>
          </SelectContent>
        </Select>
      </div>

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