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
import { Search, FileDown, Plus, Settings, Calendar } from "lucide-react"
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
import * as XLSX from 'xlsx';
import { ExcelSettingsModal } from "@/components/excel-settings-modal"
import { Checkbox } from "@/components/ui/checkbox"
import { DateRange } from 'react-day-picker'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from "@/lib/utils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { useToast } from "@/components/ui/use-toast"
import { CheckCircle2 } from "lucide-react"
import { CircleAlert  } from "lucide-react"

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
  discount_price?: number
  discount?: number
}

interface Column {
  key: keyof Product | 'actions' | 'detail' | 'checkbox';
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
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [isFilterOptionsLoading, setIsFilterOptionsLoading] = useState(true);
  const [filterOptionsError, setFilterOptionsError] = useState<string | null>(null);
  const [isSessionLoaded, setIsSessionLoaded] = useState(false);
  const [showExcelSettings, setShowExcelSettings] = useState(false);
  const [excelSettings, setExcelSettings] = useState({
    includeImage: true,
    includeUrl: true,
    includeCost: true,
    includeDiscount: true
  });

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
  const { toast } = useToast();

  // 컬럼 정의를 상수로 분리
  const columns: Column[] = [
    { key: 'checkbox', label: '' },
    { key: 'actions', label: '담기' },
    { key: "product_id", label: "이지어드민" },
    { 
      key: "img_desc1", 
      label: "이미지",
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
          <div className="font-medium truncate">{value}</div>
          <div className="text-sm text-gray-500 mt-1 truncate">
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
    { key: "drop_yn", label: "드랍" },
    { key: "supply_name", label: "공급처" },
    { key: "exclusive2", label: "단독" },
    { 
      key: "total_order_qty", 
      label: "판매량", 
      format: (value: number) => {
        if (value === undefined || value === null) return '-';
        return value.toLocaleString();
      }
    },
    { 
      key: "product_desc", 
      label: "URL",
      format: (value: string) => value ? (
        <a href={value} target="_blank" rel="noopener noreferrer">
          링크
        </a>
      ) : '-'
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
        if (session) {
          setUser(session);
          setIsSessionLoaded(true);
          // 세션 로드 후 바로 검색 상태 불러오기
          await loadSearchState(session, setSearchTerm, setSearchType, setFilters, setData);
        } else {
          setIsSessionLoaded(true);
          await resetState();
        }
      } catch (error) {
        console.error('세션 로드 오류:', error);
        setIsSessionLoaded(true);
        await resetState();
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, []);

  // 저장된 검색 상태 불러오기
  useEffect(() => {
    if (isSessionLoaded && user) {
      loadSearchState(user, setSearchTerm, setSearchType, setFilters, setData);
    }
  }, [isSessionLoaded, user]);

  // 페이지 포커스 시 검색 상태 다시 불러오기
  useEffect(() => {
    const handleFocus = async () => {
      if (isSessionLoaded && user) {
        await loadSearchState(user, setSearchTerm, setSearchType, setFilters, setData);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isSessionLoaded, user]);

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
          const productIds = data.productIds || [];
          setCartItems(new Set(productIds));
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

  // 날짜 선택 핸들러 추가
  const handleDateSelect = (range: DateRange | undefined) => {
    if (range?.from) {
      const newFilters = {
        ...filters,
        order_date_from: format(range.from, 'yyyy-MM-dd'),
        order_date_to: range.to ? format(range.to, 'yyyy-MM-dd') : ''
      };
      setFilters(newFilters);
      fetchData(newFilters);
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

    setFilters(newFilters);
    await fetchData(newFilters);
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
        const currentProductIds = data.productIds || [];
        const currentProducts = data.products || [];
        
        // 해당 상품 ID 제거
        const updatedProductIds = currentProductIds.filter((id: string) => id !== product.product_id);
        const updatedProducts = currentProducts.filter((p: Product) => p.product_id !== product.product_id);
        
        // Firestore 업데이트
        await setDoc(docRef, {
          productIds: updatedProductIds,
          products: updatedProducts,
          updatedAt: new Date().toISOString()
        });

        // 로컬 상태 업데이트
        setCartItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(product.product_id);
          return newSet;
        });
 
        toast({
          description: <div className="flex items-center gap-2"><CircleAlert className="h-5 w-5" /> 담은 상품에서 제거되었습니다.</div>,
          variant: "destructive"
        });
      }
    } catch (error) { 
      toast({
        title: "오류",
        description: <div className="flex items-center gap-2"><CircleAlert className="h-5 w-5" /> 담은 상품에서 제거하는 중 오류가 발생했습니다.</div>,
        variant: "destructive"
      });
    }
  };

  // 선택된 상품 담기 기능
  const handleAddSelectedToCart = async (selectedProducts: Set<string>) => {
    try {
      if (!user) { 
        toast({
          title: "로그인 필요",
          description: <div className="flex items-center gap-2"><CircleAlert className="h-5 w-5" /> 상품을 담으려면 로그인이 필요합니다.</div>,
          variant: "destructive"
        });
        return;
      }

      const docRef = doc(db, 'userCarts', user.uid);
      const docSnap = await getDoc(docRef);
      
      let currentProductIds: string[] = [];
      let currentProducts: any[] = [];
      if (docSnap.exists()) {
        const data = docSnap.data();
        currentProductIds = data.productIds || [];
        currentProducts = data.products || [];
      }

      // 선택된 상품들 중 이미 장바구니에 있는 상품 제외
      const newProducts = data.filter(item => 
        selectedProducts.has(item.product_id) && 
        !currentProductIds.includes(item.product_id)
      );

      if (newProducts.length === 0) { 
        toast({ 
          description: <div className="flex items-center gap-2"><CircleAlert className="h-5 w-5" /> 선택한 상품이 모두 이미 장바구니에 있습니다.</div>,
          variant: "destructive"
        });
        return;
      }

      // 필요한 필드만 추출
      const simplifiedProducts = newProducts.map(product => ({
        product_id: product.product_id,
        name: product.name,
        org_price: product.org_price,
        shop_price: product.shop_price,
        cost_ratio: product.cost_ratio,
        total_stock: product.total_stock,
        total_order_qty: product.total_order_qty,
        img_desc1: product.img_desc1,
        category_3: product.category_3,
        brand: product.brand,
        category_1: product.category_1,
        extra_column2: product.extra_column2,
        drop_yn: product.drop_yn || '',
        exclusive2: product.exclusive2 || '',
        supply_name: product.supply_name || '' 
      }));

      // Firestore 업데이트
      await setDoc(docRef, {
        productIds: [...currentProductIds, ...newProducts.map(p => p.product_id)],
        products: [...currentProducts, ...simplifiedProducts],
        updatedAt: new Date().toISOString()
      });

      // 로컬 상태 업데이트
      setCartItems(prev => new Set([...prev, ...newProducts.map(p => p.product_id)]));
      setSelectedProducts(new Set()); // 선택 초기화
 
      toast({ 
        description: <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5" /> {newProducts.length}개의 상품을 리스트에 추가 했습니다.</div>,
      });
    } catch (error) { 
      toast({
        title: "오류",
        description: <div className="flex items-center gap-2"><CircleAlert className="h-5 w-5" /> 선택한 상품을 리스트에 담는 중 오류가 발생했습니다.</div>,
        variant: "destructive"
      });
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

  // 엑셀 다운로드 함수 수정
  const handleExcelDownload = () => {
    // 엑셀 데이터 준비
    const excelData = data.map(item => {
      const baseData: any = {
        '이지어드민': item.product_id,
        '상품명': item.name,
        '판매가': item.shop_price?.toLocaleString() || '-',
        '카테고리': item.category_3 || '-',
        '원가율': item.cost_ratio ? `${item.cost_ratio}%` : '-',
        '재고': item.total_stock?.toLocaleString() || '-',
        '품절률': item.soldout_rate ? `${item.soldout_rate}%` : '-',
        '드랍여부': item.drop_yn || '-',
        '공급처명': item.supply_name || '-',
        '단독여부': item.exclusive2 || '-',
        '판매수량': item.total_order_qty?.toLocaleString() || '-'
      };

      if (excelSettings.includeImage) {
        baseData['이미지'] = item.img_desc1 || '';
      }
      if (excelSettings.includeUrl) {
        baseData['URL'] = item.product_desc || '-';
      }
      if (excelSettings.includeCost) {
        baseData['원가'] = item.org_price?.toLocaleString() || '-';
      }
      if (excelSettings.includeDiscount) {
        baseData['할인가'] = item.discount_price?.toLocaleString() || '-';
        baseData['할인율'] = item.discount_price && item.shop_price 
          ? `${Math.round(((item.shop_price - item.discount_price) / item.shop_price) * 100)}%`
          : item.discount ? `${item.discount}%` : '-';
      }

      return baseData;
    });

    // 워크북 생성
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // 컬럼 너비 설정
    const colWidths = [
      { wch: 15 }, // 이지어드민
      ...(excelSettings.includeImage ? [{ wch: 20 }] : []), // 이미지
      { wch: 40 }, // 상품명
      ...(excelSettings.includeCost ? [{ wch: 15 }] : []), // 원가
      { wch: 15 }, // 판매가
      ...(excelSettings.includeDiscount ? [{ wch: 15 }, { wch: 10 }] : []), // 할인가, 할인율
      { wch: 15 }, // 카테고리
      { wch: 10 }, // 원가율
      { wch: 10 }, // 재고
      { wch: 10 }, // 품절률
      { wch: 10 }, // 드랍여부
      { wch: 20 }, // 공급처명
      { wch: 10 }, // 단독여부
      { wch: 15 }, // 판매수량
      ...(excelSettings.includeUrl ? [{ wch: 30 }] : []) // URL
    ];
    ws['!cols'] = colWidths;

    // 워크시트를 워크북에 추가
    XLSX.utils.book_append_sheet(wb, ws, "검색결과");

    // 현재 날짜와 시간을 YYYYMMDDHHmm 형식으로 변환
    const now = new Date();
    const dateStr = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0');

    // 파일 저장
    XLSX.writeFile(wb, `검색결과_${dateStr}.xlsx`);
  };

  return (
    <div className="container mx-auto py-5">
      <h1 className="text-2xl font-bold mb-6">상품 검색</h1>
      
      <div className="flex justify-between mb-6 py-5 px-5 bg-card rounded-lg shadow-sm">
        <div className="">
          <h1 className="text-1xl font-bold mb-4">상품 검색 필터</h1>
          <div className="flex items-center gap-4 pb-4">
          <div className="text-sm text-gray-500">검색조건</div>
            <Select
              value={searchType}
              onValueChange={(value: SearchType) => setSearchType(value)}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="검색 유형 선택" />
              </SelectTrigger>
              <SelectContent className="min-w-[100px]">
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
          </div>
          
          <div className="flex items-center gap-4 pb-4">
          <div className="text-sm text-gray-500">분류선택</div>
          <Select
            value={filters.category_3}
            onValueChange={(value) => handleFilterChange('category_3', value)}
          >
            <SelectTrigger className={`w-[100px] ${filters.category_3 !== 'all' ? 'bg-blue-50 border-blue-200' : ''}`}>
              <SelectValue placeholder="카테고리" />
            </SelectTrigger>
            <SelectContent className="min-w-[100px]">
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
            <SelectTrigger className={`w-[100px] ${filters.extra_column2 !== 'all' ? 'bg-blue-50 border-blue-200' : ''}`}>
              <SelectValue placeholder="출시시즌" />
            </SelectTrigger>
            <SelectContent className="min-w-[100px]">
              <SelectItem value="all">시즌</SelectItem>
              {Array.from(dynamicFilterOptions.extra_column2).map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>

          <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">상세검색</div>
          <Select
            value={filters.drop_yn}
            onValueChange={(value) => handleFilterChange('drop_yn', value)}
          >
            <SelectTrigger className={`w-[100px] ${filters.drop_yn !== 'all' ? 'bg-blue-50 border-blue-200' : ''}`}>
              <SelectValue placeholder="드랍여부" />
            </SelectTrigger>
            <SelectContent className="min-w-[100px]">
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
            <SelectTrigger className={`w-[100px] ${filters.supply_name !== 'all' ? 'bg-blue-50 border-blue-200' : ''}`}>
              <SelectValue placeholder="공급처명" />
            </SelectTrigger>
            <SelectContent className="min-w-[100px]">
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
            <SelectTrigger className={`w-[100px] ${filters.exclusive2 !== 'all' ? 'bg-blue-50 border-blue-200' : ''}`}>
              <SelectValue placeholder="단독여부" />
            </SelectTrigger>
            <SelectContent className="min-w-[100px]">
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

        <div className="">
          <h1 className="text-1xl font-bold mb-4">판매량 필터</h1>
          <div className="flex items-center gap-4 pb-4">
          <div className="text-sm text-gray-500">판매량 분류</div>
            <Select
              value={filters.code30}
              onValueChange={(value) => handleFilterChange('code30', value)}
            >
              <SelectTrigger className={`w-[100px] ${filters.code30 !== 'all' ? 'bg-blue-50 border-blue-200' : ''} `}>
                <SelectValue placeholder="주문국가" />
              </SelectTrigger>
              <SelectContent className="min-w-[100px]">
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
              <SelectTrigger className={`w-[100px] ${filters.channel_category_2 !== 'all' ? 'bg-blue-50 border-blue-200' : ''} `}>
                <SelectValue placeholder="구분" />
              </SelectTrigger>
              <SelectContent className="min-w-[100px]">
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
              <SelectTrigger className={`w-[100px] ${filters.channel_category_3 !== 'all' ? 'bg-blue-50 border-blue-200' : ''} `}>
                <SelectValue placeholder="분류" />
              </SelectTrigger>
              <SelectContent className="min-w-[100px]">
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
              <SelectTrigger className={`w-[100px] ${filters.channel_name !== 'all' ? 'bg-blue-50 border-blue-200' : ''} `}>
                <SelectValue placeholder="채널명" />
              </SelectTrigger>
              <SelectContent className="min-w-[100px]">
                <SelectItem value="all">전체 채널</SelectItem>
                {Array.from(dynamicFilterOptions.channel_name).map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">판매량 기간</div>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[300px] justify-start text-left font-normal",
                      !filters.order_date_from && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {filters.order_date_from ? (
                      <>
                        {format(new Date(filters.order_date_from), 'PPP', { locale: ko })} -{" "}
                        {filters.order_date_to ? format(new Date(filters.order_date_to), 'PPP', { locale: ko }) : "선택"}
                      </>
                    ) : (
                      <span>날짜 선택</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="range"
                    defaultMonth={filters.order_date_from ? new Date(filters.order_date_from) : new Date()}
                    selected={{
                      from: filters.order_date_from ? new Date(filters.order_date_from) : undefined,
                      to: filters.order_date_to ? new Date(filters.order_date_to) : undefined
                    }}
                    onSelect={handleDateSelect}
                    locale={ko}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
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

        <div className="w-[80px] flex place-items-center">
          <div className="flex flex-col gap-2 w-[80px]">
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

      <div className="py-5 px-5 bg-card rounded-lg shadow-sm">
        <div className="flex justify-between mb-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const tempSelected = new Set([...selectedProducts]);
                handleAddSelectedToCart(tempSelected);
              }}
              disabled={selectedProducts.size === 0}
              className="border-0 hover:bg-transparent text-[hsl(var(--foreground))] hover:text-[hsl(var(--foreground))]"
            >
              선택담기
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExcelDownload}
              className="border-0 hover:bg-transparent text-[hsl(var(--foreground))] hover:text-[hsl(var(--foreground))]"
            >
              다운로드
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExcelSettings(true)}
              className="border-0 hover:bg-transparent text-[hsl(var(--foreground))] hover:text-[hsl(var(--foreground))]"
            >
              양식변경
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-500">
            검색된 항목 : {data.length}개
            </div>
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
        </div>

        <div className="rounded-md border overflow-hidden">
          <div className="w-full">
            <div className="bg-muted sticky top-0 z-10">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="hover:bg-muted">
                    {columns.map((column) => (
                      <TableHead 
                        key={column.key} 
                        className="text-center border-b whitespace-nowrap"
                        style={{ 
                          width: column.key === 'checkbox' ? '44px' :
                                column.key === 'actions' ? '44px' :
                                column.key === 'img_desc1' ? '64px' :
                                column.key === 'product_id' ? '84px' :
                                column.key === 'name' ? '284px' :
                                column.key === 'product_desc' ? '84px' :
                                column.key === 'org_price' ? '64px' :
                                column.key === 'shop_price' ? '64px' :
                                column.key === 'category_3' ? '64px' :
                                column.key === 'cost_ratio' ? '64px' :
                                column.key === 'total_stock' ? '64px' :
                                column.key === 'soldout_rate' ? '64px' :
                                column.key === 'drop_yn' ? '64px' :
                                column.key === 'supply_name' ? '104px' :
                                column.key === 'exclusive2' ? '64px' :
                                column.key === 'total_order_qty' ? '64px' :
                                '64px'
                        }}
                      >
                        {column.key === 'checkbox' ? (
                          <Checkbox
                            checked={data.length > 0 && selectedProducts.size === data.length}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedProducts(new Set(data.map(p => p.product_id)));
                              } else {
                                setSelectedProducts(new Set());
                              }
                            }}
                          />
                        ) : column.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
              </Table>
            </div>
            <div className="overflow-y-auto max-h-[calc(100vh-400px)]">
              <Table className="w-full">
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
                          <TableCell 
                            key={column.key} 
                            className="text-center whitespace-nowrap"
                            style={{ 
                              width: column.key === 'checkbox' ? '44px' :
                                    column.key === 'actions' ? '44px' :
                                    column.key === 'img_desc1' ? '64px' :
                                    column.key === 'product_id' ? '84px' :
                                    column.key === 'name' ? '284px' :
                                    column.key === 'product_desc' ? '84px' :
                                    column.key === 'org_price' ? '64px' :
                                    column.key === 'shop_price' ? '64px' :
                                    column.key === 'category_3' ? '64px' :
                                    column.key === 'cost_ratio' ? '64px' :
                                    column.key === 'total_stock' ? '64px' :
                                    column.key === 'soldout_rate' ? '64px' :
                                    column.key === 'drop_yn' ? '64px' :
                                    column.key === 'supply_name' ? '104px' :
                                    column.key === 'exclusive2' ? '64px' :
                                    column.key === 'total_order_qty' ? '64px' :
                                    '64px'
                            }}
                          >
                            {column.key === 'checkbox' ? (
                              <Checkbox
                                checked={selectedProducts.has(item.product_id)}
                                onCheckedChange={(checked) => {
                                  const newSelected = new Set(selectedProducts);
                                  if (checked) {
                                    newSelected.add(item.product_id);
                                  } else {
                                    newSelected.delete(item.product_id);
                                  }
                                  setSelectedProducts(newSelected);
                                }}
                              />
                            ) : column.key === 'actions' ? (
                              cartItems.has(item.product_id) ? (
                                <button
                                  onClick={() => handleRemoveFromCart(item)}
                                  className="w-6 h-6 flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 transition-colors rounded-full mx-auto text-sm leading-none"
                                >
                                  -
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    const tempSelected = new Set([item.product_id]);
                                    handleAddSelectedToCart(tempSelected);
                                  }}
                                  className="w-6 h-6 flex items-center justify-center bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors rounded-full mx-auto text-sm leading-none"
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
          </div>
        </div>
      </div>

      {selectedProductId && (
        <ProductDetailModal
          productId={selectedProductId}
          onClose={() => setSelectedProductId(null)}
        />
      )}

      {showExcelSettings && (
        <ExcelSettingsModal
          isOpen={showExcelSettings}
          onClose={() => setShowExcelSettings(false)}
          settings={excelSettings}
          onSettingsChange={setExcelSettings}
        />
      )}
    </div>
  )
} 