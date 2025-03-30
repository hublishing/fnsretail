'use client'

import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getSession } from '@/app/actions/auth';
import { ProductDetailModal } from "@/components/product-detail-modal"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { v4 as uuidv4 } from 'uuid';
import { Search, FileDown, Settings } from "lucide-react"
import * as XLSX from 'xlsx';
import { ExcelSettingsModal } from "@/components/excel-settings-modal"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { CouponModal } from "../../components/coupon-modal"

interface Product {
  product_id: string;
  name: string;
  org_price: number;
  shop_price: number;
  img_desc1: string;
  product_desc: string;
  extra_column2: string;
  cost_ratio: number;
  category_1: string;
  category_3: string;
  main_wh_available_stock_excl_production_stock: number;
  total_stock: number;
  drop_yn: string;
  soldout_rate: number;
  supply_name: string;
  exclusive2: string;
  detail?: never;
  options_product_id: string;
  brand?: string;
  line?: string;
  season?: string;
  total_order_qty?: number;
  recent_order_dates?: string[];
  order_countries?: string[];
  order_channels?: string[];
  order_categories?: string[];
  order_types?: string[];
  discount_price?: number;
  discount?: number;
  discount_rate?: number;
  coupon1_price?: number;
  coupon2_price?: number;
  coupon3_price?: number;
  isSelected?: boolean;
}

interface Column {
  key: keyof Product | 'actions';
  label: string;
  format?: (value: any) => React.ReactNode;
  render?: (product: Product) => React.ReactNode;
}

interface Filters {
  channel_name: string;
  delivery_type: string;
}

interface ChannelInfo {
  channel_name: string;
  channel_category_2: string;
  channel_category_3: string;
  team: string;
  manager: string;
  shop_id: string;
  shop_name: string;
  used: string;
  price_formula: string;
  shipping_formula: string;
  exchange_rate: string;
  currency: string;
  correction_rate: string;
  amount: string;
  comment: string;
  use_yn: string;
  type: string;
  markup_ratio: string;
  applied_exchange_rate: string;
  rounddown: string;
  digit_adjustment: string;
  currency_2: string;
  average_fee_rate: string;
  shipping_condition: string;
  outerbox_fee: string;
  domestic_delivery_fee: string;
  shipping_fee: string;
  customs_fee: string;
  declaration_fee: string;
  innerbox_fee: string;
  packingbox_fee: string;
  brand_type: string;
  free_shipping: number;
  conditional_shipping: number;
}

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
  brand?: string;
  url?: string;
}

interface ExcelSettings {
  includeImage: boolean;
  includeUrl: boolean;
  includeCost: boolean;
  includeDiscount: boolean;
}

// 정렬 가능한 행 컴포넌트
function SortableTableRow({ product, children, ...props }: { 
  product: Product;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLTableRowElement>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.product_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // 드래그 속성을 자식 컴포넌트에 전달
  const childrenWithProps = React.Children.map(children, (child, index) => {
    if (React.isValidElement(child)) {
      // 상품명 셀(index 4)에는 드래그 속성을 전달하지 않음
      if (index === 4) {
        return child;
      }
      return React.cloneElement(child, { ...attributes, ...listeners });
    }
    return child;
  });

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? 'bg-muted' : ''}`}
      {...props}
    >
      {childrenWithProps}
    </TableRow>
  );
}

// 체크박스 셀 컴포넌트
function CheckboxCell({ product, selectedProducts, onSelect }: { 
  product: Product; 
  selectedProducts: string[];
  onSelect: (checked: boolean) => void;
}) {
  return (
    <TableCell className="text-center w-[30px]">
      <Checkbox 
        checked={selectedProducts.includes(product.product_id)}
        onCheckedChange={onSelect}
      />
    </TableCell>
  );
}

// 드래그 가능한 셀 컴포넌트
function DraggableCell({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) {
  return (
    <TableCell 
      className="cursor-move" 
      {...props}
    >
      {children}
    </TableCell>
  );
}

export default function CartPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<'default' | 'qty_desc' | 'qty_asc' | 'stock_desc' | 'stock_asc'>('qty_desc');
  const [sortedProducts, setSortedProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [channelSearchTerm, setChannelSearchTerm] = useState('');
  const [showChannelSuggestions, setShowChannelSuggestions] = useState(false);
  const [filteredChannels, setFilteredChannels] = useState<ChannelInfo[]>([]);
  const [isValidChannel, setIsValidChannel] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    channel_name: '',
    delivery_type: ''
  });
  const [discountRate, setDiscountRate] = useState<number>(0);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountUnit, setDiscountUnit] = useState<'원' | '%'>('%');
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [listUuid, setListUuid] = useState<string>('');
  const [usedUuids] = useState<Set<string>>(new Set());
  const [deliveryType, setDeliveryType] = useState<string>('');
  const [isValidDeliveryType, setIsValidDeliveryType] = useState(true);
  const [selectedChannelInfo, setSelectedChannelInfo] = useState<ChannelInfo | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [showExcelSettings, setShowExcelSettings] = useState(false);
  const [excelSettings, setExcelSettings] = useState<ExcelSettings>({
    includeImage: true,
    includeUrl: true,
    includeCost: true,
    includeDiscount: true,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [coupons, setCoupons] = useState<{
    coupon1: { value: number; type: 'percentage' | 'fixed'; minAmount: number };
    coupon2: { value: number; type: 'percentage' | 'fixed'; minAmount: number };
    coupon3: { value: number; type: 'percentage' | 'fixed'; minAmount: number };
  }>({
    coupon1: { value: 0, type: 'percentage', minAmount: 0 },
    coupon2: { value: 0, type: 'percentage', minAmount: 0 },
    coupon3: { value: 0, type: 'percentage', minAmount: 0 },
  });
  const [memo, setMemo] = useState<string>('');

  // UUID 생성 함수
  const generateUniqueId = () => {
    let newUuid: string;
    do {
      // UUID v4에서 숫자와 알파벳만 추출
      newUuid = uuidv4().replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
    } while (usedUuids.has(newUuid));
    
    usedUuids.add(newUuid);
    return newUuid;
  };

  // 사용자 세션 로드
  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const session = await getSession();
        if (!isMounted) return;
        
        if (!session) {
          setLoading(false);
          return;
        }
        
        setUser(session);
        setListUuid(generateUniqueId());
        
        const docRef = doc(db, 'userCarts', session.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.products && Array.isArray(data.products)) {
            setProducts(data.products);
          }
          // 저장된 정보 로드
          if (data.title) setTitle(data.title);
          if (data.channel_name) {
            setChannelSearchTerm(data.channel_name);
            setFilters(prev => ({ ...prev, channel_name: data.channel_name }));
          }
          if (data.delivery_type) {
            setDeliveryType(data.delivery_type);
            setFilters(prev => ({ ...prev, delivery_type: data.delivery_type }));
          }
          if (data.start_date) setStartDate(data.start_date);
          if (data.end_date) setEndDate(data.end_date);
          if (data.memo) setMemo(data.memo);
        }
      } catch (error) {
        console.error('세션 또는 장바구니 데이터 로드 오류:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // 채널 정보 로드
  useEffect(() => {
    let isMounted = true;

    const loadChannels = async () => {
      try {
        const response = await fetch('/api/channels');
        if (!response.ok) {
          throw new Error('채널 정보를 가져오는데 실패했습니다.');
        }
        const data = await response.json();
        if (data.channels && isMounted) {
          // 채널 정보를 한 번만 처리
          const uniqueChannels = data.channels.reduce((acc: ChannelInfo[], curr: ChannelInfo) => {
            const existingChannel = acc.find(c => c.channel_name === curr.channel_name);
            if (!existingChannel || (curr.use_yn === '운영중' && existingChannel.use_yn !== '운영중')) {
              if (existingChannel) {
                const index = acc.findIndex(c => c.channel_name === curr.channel_name);
                acc[index] = curr;
              } else {
                acc.push(curr);
              }
            }
            return acc;
          }, []);
          setChannels(uniqueChannels);
        }
      } catch (error) {
        console.error('채널 정보 로드 오류:', error);
      }
    };
    
    loadChannels();

    return () => {
      isMounted = false;
    };
  }, []);

  // 채널 검색어 변경 시 필터링 - 디바운스 적용
  useEffect(() => {
    const timer = setTimeout(() => {
      if (channelSearchTerm.trim()) {
        const filtered = channels.filter(channel => 
          channel.channel_name.toLowerCase().includes(channelSearchTerm.toLowerCase())
        );
        setFilteredChannels(filtered);
        setShowChannelSuggestions(true);
      } else {
        setFilteredChannels([]);
        setShowChannelSuggestions(false);
      }
    }, 300); // 300ms 디바운스

    return () => clearTimeout(timer);
  }, [channelSearchTerm, channels]);

  // 채널 검색 입력 핸들러
  const handleChannelSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setChannelSearchTerm(value);
    // 입력된 값이 채널 목록에 있는지 확인
    setIsValidChannel(channels.some(c => c.channel_name === value));
  };

  // 채널 선택 핸들러
  const handleChannelSelect = async (channel: ChannelInfo) => {
    setChannelSearchTerm(channel.channel_name);
    setShowChannelSuggestions(false);
    setIsValidChannel(true);
    setFilters(prev => ({
      ...prev,
      channel_name: channel.channel_name
    }));
    setSelectedChannelInfo(channel);
    await saveCartInfo();
  };

  // 채널 검색창 포커스 핸들러
  const handleChannelSearchFocus = () => {
    if (channelSearchTerm.trim()) {
      setShowChannelSuggestions(true);
    }
  };

  // 채널 검색창 블러 핸들러
  const handleChannelSearchBlur = () => {
    // 약간의 지연을 주어 선택 이벤트가 먼저 발생하도록 함
    setTimeout(() => {
      setShowChannelSuggestions(false);
    }, 200);
  };

  // 드래그 앤 드롭 핸들러
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setIsDragging(false);
    
    if (over && active.id !== over.id) {
      const oldIndex = products.findIndex((item) => item.product_id === active.id);
      const newIndex = products.findIndex((item) => item.product_id === over.id);
      
      const newProducts = arrayMove(products, oldIndex, newIndex);
      setProducts(newProducts);

      // Firebase에 순서 정보 저장
      try {
        if (user) {
          const docRef = doc(db, 'userCarts', user.uid);
          await setDoc(docRef, {
            products: newProducts,
            updatedAt: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('순서 저장 중 오류 발생:', error);
        // 에러 발생 시 원래 순서로 되돌리기
        setProducts(products);
      }
    }
  };

  // 드래그 시작 핸들러
  const handleDragStart = () => {
    setIsDragging(true);
  };

  // 드래그 앤 드롭 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 상품 추가 시에도 순서 정보 저장
  const handleAddToCart = async (product: Product) => {
    try {
      const newProducts = [...products, product];
      setProducts(newProducts);
      
      if (user) {
        console.log('파이어스토어 저장 시도:', {
          userId: user.uid,
          product: product
        });
        
        const docRef = doc(db, 'userCarts', user.uid);
        await setDoc(docRef, {
          products: newProducts,
          updatedAt: new Date().toISOString()
        });
        
        console.log('파이어스토어 저장 성공');
      } else {
        console.log('사용자가 로그인되어 있지 않음');
      }
    } catch (error) {
      console.error('상품 추가 중 오류 발생:', error);
      setProducts(products);
    }
  };

  // 상품 제거 시에도 순서 정보 저장
  const handleRemoveFromCart = async (productId: string) => {
    try {
      const newProducts = products.filter(p => p.product_id !== productId);
      setProducts(newProducts);
      
      if (user) {
        const docRef = doc(db, 'userCarts', user.uid);
        await setDoc(docRef, {
          products: newProducts,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('상품 제거 중 오류 발생:', error);
      setProducts(products);
    }
  };

  // 정보 저장 함수
  const saveCartInfo = async () => {
    if (!user) return;

    try {
      const docRef = doc(db, 'userCarts', user.uid);
      await setDoc(docRef, {
        products,
        title,
        channel_name: filters.channel_name,
        delivery_type: filters.delivery_type,
        start_date: startDate,
        end_date: endDate,
        memo,
        updatedAt: new Date().toISOString()
      });
      console.log('장바구니 정보 저장 성공');
    } catch (error) {
      console.error('장바구니 정보 저장 중 오류 발생:', error);
    }
  };

  // 타이틀 변경 핸들러
  const handleTitleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTitle(value);
    await saveCartInfo();
  };

  // 배송조건 변경 핸들러
  const handleDeliveryTypeChange = async (value: string) => {
    setDeliveryType(value);
    setIsValidDeliveryType(true);
    setFilters(prev => ({
      ...prev,
      delivery_type: value
    }));
    await saveCartInfo();
  };

  // 날짜 변경 핸들러 수정
  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'end') => {
    const value = e.target.value;
    if (type === 'start') {
      setStartDate(value);
    } else {
      setEndDate(value);
    }
    await saveCartInfo();
  };

  // 메모 변경 핸들러
  const handleMemoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMemo(value);
    await saveCartInfo();
  };

  // 정렬 상태 변경 시 상품 정렬 - 메모이제이션 적용
  useEffect(() => {
    if (!products.length) return;
    
    const sortedItems = [...products].sort((a, b) => {
      switch (sortOption) {
        case 'qty_desc':
          return (b.total_order_qty || 0) - (a.total_order_qty || 0);
        case 'qty_asc':
          return (a.total_order_qty || 0) - (b.total_order_qty || 0);
        case 'stock_desc':
          return (b.total_stock || 0) - (a.total_stock || 0);
        case 'stock_asc':
          return (a.total_stock || 0) - (b.total_stock || 0);
        default:
          return 0;
      }
    });
    
    setSortedProducts(sortedItems);
  }, [products, sortOption]);

  // 할인 적용 핸들러
  const handleApplyDiscount = async () => {
    if (!selectedProducts.length) {
      alert('할인을 적용할 상품을 선택해주세요.');
      return;
    }

    if (!filters.channel_name) {
      alert('채널을 선택해주세요.');
      return;
    }

    if (!discountValue) {
      alert('할인값을 입력해주세요.');
      return;
    }

    const updatedProducts = products.map(product => {
      if (selectedProducts.includes(product.product_id)) {
        let discountPrice = product.shop_price;
        if (discountType === 'fixed') {
          discountPrice = product.shop_price - discountValue;
        } else {
          discountPrice = Math.round(product.shop_price * (1 - discountValue / 100));
        }

        return {
          ...product,
          discount: discountValue,
          discount_unit: discountType,
          discount_price: discountPrice,
          discount_rate: Math.round(((product.shop_price - discountPrice) / product.shop_price) * 100)
        };
      }
      return product;
    });

    setProducts(updatedProducts);
    
    // 파이어스토어에 저장
    if (user) {
      try {
        const docRef = doc(db, 'userCarts', user.uid);
        await setDoc(docRef, {
          products: updatedProducts,
          updatedAt: new Date().toISOString()
        });
        console.log('할인 정보 저장 성공');
      } catch (error) {
        console.error('할인 정보 저장 중 오류 발생:', error);
      }
    }
    
    setShowDiscountModal(false);
    setDiscountValue(0);
  };

  // 엑셀 다운로드 함수
  const handleExcelDownload = () => {
    // 엑셀 데이터 준비
    const excelData = products.map(item => {
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
        baseData['즉시할인'] = item.discount_price?.toLocaleString() || '-';
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
    XLSX.utils.book_append_sheet(wb, ws, "상품리스트");

    // 현재 날짜와 시간을 YYYYMMDDHHmm 형식으로 변환
    const now = new Date();
    const dateStr = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0');

    // 파일 저장
    XLSX.writeFile(wb, `상품리스트_${dateStr}.xlsx`);
  };

  const handleRemoveSelectedProducts = async () => {
    if (selectedProducts.length === 0) {
      alert('삭제할 상품을 선택해주세요.');
      return;
    }

    if (!confirm(`선택된 ${selectedProducts.length}개의 상품을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const newProducts = products.filter(p => !selectedProducts.includes(p.product_id));
      setProducts(newProducts);
      setSelectedProducts([]);
      
      if (user) {
        const docRef = doc(db, 'userCarts', user.uid);
        await setDoc(docRef, {
          products: newProducts,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('선택된 상품 삭제 중 오류 발생:', error);
      alert('상품 삭제 중 오류가 발생했습니다.');
    }
  };

  // 쿠폰 적용 핸들러
  const handleApplyCoupons = async (newCoupons: typeof coupons) => {
    setCoupons(newCoupons);
    
    if (!selectedProducts.length) {
      alert('쿠폰을 적용할 상품을 선택해주세요.');
      return;
    }
    
    const updatedProducts = products.map(product => {
      if (!selectedProducts.includes(product.product_id)) {
        return product;
      }

      if (!product.discount_price) {
        return product;
      }

      // 쿠폰1 계산
      let coupon1Price = product.discount_price;
      let coupon1Rate = 0;
      if (product.discount_price >= newCoupons.coupon1.minAmount) {
        if (newCoupons.coupon1.type === 'percentage') {
          coupon1Price = Math.round(product.discount_price * (1 - newCoupons.coupon1.value / 100));
          coupon1Rate = newCoupons.coupon1.value;
        } else {
          coupon1Price = product.discount_price - newCoupons.coupon1.value;
          coupon1Rate = Math.round((newCoupons.coupon1.value / product.discount_price) * 100);
        }
      }

      // 쿠폰2 계산
      let coupon2Price = coupon1Price;
      let coupon2Rate = 0;
      if (coupon1Price >= newCoupons.coupon2.minAmount) {
        if (newCoupons.coupon2.type === 'percentage') {
          coupon2Price = Math.round(coupon1Price * (1 - newCoupons.coupon2.value / 100));
          coupon2Rate = newCoupons.coupon2.value;
        } else {
          coupon2Price = coupon1Price - newCoupons.coupon2.value;
          coupon2Rate = Math.round((newCoupons.coupon2.value / coupon1Price) * 100);
        }
      }

      // 쿠폰3 계산
      let coupon3Price = coupon2Price;
      let coupon3Rate = 0;
      if (coupon2Price >= newCoupons.coupon3.minAmount) {
        if (newCoupons.coupon3.type === 'percentage') {
          coupon3Price = Math.round(coupon2Price * (1 - newCoupons.coupon3.value / 100));
          coupon3Rate = newCoupons.coupon3.value;
        } else {
          coupon3Price = coupon2Price - newCoupons.coupon3.value;
          coupon3Rate = Math.round((newCoupons.coupon3.value / coupon2Price) * 100);
        }
      }

      return {
        ...product,
        coupon1_price: coupon1Price,
        coupon2_price: coupon2Price,
        coupon3_price: coupon3Price,
        coupon1_rate: coupon1Rate,
        coupon2_rate: coupon2Rate,
        coupon3_rate: coupon3Rate,
        final_discount_rate: Math.round(((product.shop_price - (coupon3Price || coupon2Price || coupon1Price || product.discount_price)) / product.shop_price) * 100)
      };
    });

    setProducts(updatedProducts);
    
    // 파이어스토어에 저장
    if (user) {
      try {
        const docRef = doc(db, 'userCarts', user.uid);
        await setDoc(docRef, {
          products: updatedProducts,
          updatedAt: new Date().toISOString()
        });
        console.log('쿠폰 정보 저장 성공');
      } catch (error) {
        console.error('쿠폰 정보 저장 중 오류 발생:', error);
      }
    }
  };

  // 초기화 핸들러 추가
  const handleReset = async () => {
    if (!confirm('리스트를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    try {
      if (user) {
        const docRef = doc(db, 'userCarts', user.uid);
        await setDoc(docRef, {
          products: [],
          title: '',
          channel_name: '',
          delivery_type: '',
          start_date: '',
          end_date: '',
          memo: '',
          updatedAt: new Date().toISOString()
        });

        // 로컬 상태 초기화
        setProducts([]);
        setTitle('');
        setChannelSearchTerm('');
        setDeliveryType('');
        setStartDate('');
        setEndDate('');
        setMemo('');
        setFilters({
          channel_name: '',
          delivery_type: ''
        });
        setSelectedProducts([]);
        setSelectedChannelInfo(null);
        setIsValidChannel(true);
        setIsValidDeliveryType(true);

        alert('리스트가 초기화되었습니다.');
      }
    } catch (error) {
      console.error('리스트 초기화 중 오류 발생:', error);
      alert('리스트 초기화 중 오류가 발생했습니다.');
    }
  };

  const columns: Column[] = [
    { key: 'actions', label: '삭제' },
    { key: "img_desc1", label: "이미지" },
    { key: "name", label: "상품명" },
    { key: "org_price", label: "원가", format: (value: number) => value?.toLocaleString() || '-' },
    { key: "shop_price", label: "판매가", format: (value: number) => value?.toLocaleString() || '-' },
    { key: "cost_ratio", label: "원가율", format: (value: number) => value ? `${value}%` : '-' },
    { key: "total_stock", label: "재고", format: (value: number) => value?.toLocaleString() || '-' },
    { key: "soldout_rate", label: "품절률", format: (value: number) => value ? `${value}%` : '-' },
    { key: "drop_yn", label: "드랍여부" },
    { key: "supply_name", label: "공급처명" },
    { key: "exclusive2", label: "단독여부" },
    { key: "total_order_qty", label: "판매수량", format: (value: number) => value?.toLocaleString() || '-' },
    { key: "product_desc", label: "URL", format: (value: string) => value ? <a href={value} target="_blank" rel="noopener noreferrer">링크</a> : '-' },
    {
      key: "discount_price",
      label: "즉시할인",
      render: (product) => (
        <div className="text-right">
          {product.discount_price ? (
            <>
              <div>{product.discount_price.toLocaleString()}원</div>
              <div className="text-sm text-muted-foreground">
                {product.discount_rate}%
              </div>
            </>
          ) : (
            "-"
          )}
        </div>
      ),
    },
    {
      key: "coupon1_price",
      label: "쿠폰1",
      render: (product) => (
        <div className="text-right">
          {product.coupon1_price ? product.coupon1_price.toLocaleString() : "-"}
        </div>
      ),
    },
    {
      key: "coupon2_price",
      label: "쿠폰2",
      render: (product) => (
        <div className="text-right">
          {product.coupon2_price ? product.coupon2_price.toLocaleString() : "-"}
        </div>
      ),
    },
    {
      key: "coupon3_price",
      label: "쿠폰3",
      render: (product) => (
        <div className="text-right">
          {product.coupon3_price ? product.coupon3_price.toLocaleString() :
           product.coupon2_price ? product.coupon2_price.toLocaleString() :
           product.coupon1_price ? product.coupon1_price.toLocaleString() :
           product.discount_price?.toLocaleString() || '-'}
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold">리스트작성</h1>
          <div className="text-sm text-gray-500 mt-1">
            <span className="mr-4">작성자: {user?.uid === 'a8mwwycqhaZLIb9iOcshPbpAVrj2' ? '한재훈' :
             user?.uid === 'MhMI2KxbxkPHIAJP0o4sPSZG35e2' ? '이세명' :
             user?.uid === '6DnflkbFSifLCNVQGWGv7aqJ2w72' ? '박연수' : ''}</span>
            <span>UUID: {listUuid}</span>
          </div>
        </div>
      </div>

      {/* 편집 섹션 */}
      <Card className="mb-12 border-0 bg-transparent shadow-none">
        <CardContent className="p-0">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                placeholder="타이틀을 입력해주세요"
                className={`w-[300px] h-10 px-3 border-[1px] rounded-md shadow-sm focus:outline-none focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 text-sm ${
                  title ? 'border-blue-500 focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 bg-muted' : 'border-input bg-background'
                }`}
              />
              <div className="relative">
                <input
                  type="text"
                  value={channelSearchTerm}
                  onChange={handleChannelSearch}
                  onFocus={handleChannelSearchFocus}
                  onBlur={handleChannelSearchBlur}
                  placeholder="채널명을 입력하세요"
                  className={`w-[160px] h-10 px-3 border-[1px] rounded-md shadow-sm focus:outline-none focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 text-sm ${
                    channelSearchTerm && !isValidChannel 
                      ? 'border-red-500 focus:ring-[1px] focus:ring-red-500 focus:border-red-500 bg-destructive/10' 
                      : channelSearchTerm && isValidChannel
                      ? 'border-blue-500 focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 bg-muted'
                      : 'border-input bg-background'
                  }`}
                />
                {showChannelSuggestions && filteredChannels.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-background border border-input rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredChannels.map((channel) => (
                      <div
                        key={channel.channel_name}
                        className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                        onClick={() => handleChannelSelect(channel as ChannelInfo)}
                      >
                        {channel.channel_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Select 
                value={deliveryType} 
                onValueChange={handleDeliveryTypeChange}
              >
                <SelectTrigger className={`w-[120px] h-10 ${
                  deliveryType ? 'border-blue-500 focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 bg-blue-50' : ''
                }`}>
                  <SelectValue placeholder="배송조건" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conditional">조건부배송</SelectItem>
                  <SelectItem value="free">무료배송</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleDateChange(e, 'start')}
                  className={`w-[150px] h-10 px-3 border-[1px] rounded-md shadow-sm focus:outline-none focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 text-sm ${
                    startDate ? 'border-blue-500 focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 bg-muted' : 'border-input bg-background'
                  }`}
                />
                <span className="text-muted-foreground">~</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleDateChange(e, 'end')}
                  className={`w-[150px] h-10 px-3 border-[1px] rounded-md shadow-sm focus:outline-none focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 text-sm ${
                    endDate ? 'border-blue-500 focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 bg-muted' : 'border-input bg-background'
                  }`}
                />
              </div>
            </div>

            {/* 채널 상세 정보 첫 번째 줄 */}
            <div className="flex items-center gap-4">
              <input
                type="text"
                value={selectedChannelInfo?.channel_category_2 || ''}
                readOnly
                placeholder="구분"
                className="w-[120px] h-10 px-3 border-[1px] rounded-md shadow-sm bg-muted text-sm text-muted-foreground"
              />
              <input
                type="text"
                value={selectedChannelInfo?.channel_category_3 || ''}
                readOnly
                placeholder="분류"
                className="w-[120px] h-10 px-3 border-[1px] rounded-md shadow-sm bg-muted text-sm text-muted-foreground"
              />
              <input
                type="text"
                value={selectedChannelInfo?.team || ''}
                readOnly
                placeholder="팀"
                className="w-[80px] h-10 px-3 border-[1px] rounded-md shadow-sm bg-muted text-sm text-muted-foreground"
              />
              <input
                type="text"
                value={selectedChannelInfo?.manager || ''}
                readOnly
                placeholder="담당자"
                className="w-[80px] h-10 px-3 border-[1px] rounded-md shadow-sm bg-muted text-sm text-muted-foreground"
              />
              <input
                type="text"
                value={selectedChannelInfo?.average_fee_rate ? `평균수수료 : ${selectedChannelInfo.average_fee_rate}` : ''}
                readOnly
                placeholder="평균수수료"
                className="w-[160px] h-10 px-3 border-[1px] rounded-md shadow-sm bg-muted text-sm text-muted-foreground"
              />
            </div>

            {/* 메모 입력창 수정 */}
            <div className="w-full">
              <input
                type="text"
                value={memo}
                onChange={handleMemoChange}
                placeholder="메모를 입력해주세요"
                className="w-full h-10 px-3 border-[1px] rounded-md shadow-sm focus:outline-none focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 text-sm border-input bg-background"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 할인 적용 섹션 */}
      <div className="mb-2">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemoveSelectedProducts}
              className="border-0 hover:bg-transparent hover:text-primary"
            >
              선택삭제
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDiscountModal(true)}
              className="border-0 hover:bg-transparent hover:text-primary"
            >
              즉시할인
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCouponModal(true)}
              className="border-0 hover:bg-transparent hover:text-primary"
              disabled={selectedProducts.length === 0 || !selectedProducts.every(id => {
                const product = products.find(p => p.product_id === id);
                return product?.discount_price !== undefined;
              })}
            >
              쿠폰
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExcelDownload}
              className="border-0 hover:bg-transparent hover:text-primary"
            >
              다운로드
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExcelSettings(true)}
              className="border-0 hover:bg-transparent hover:text-primary"
            >
              양식변경
            </Button> 
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="border-0 hover:bg-transparent hover:text-primary"
            >
              리스트 초기화
            </Button> 
          </div>
        </div>
      </div>

      {/* 상품 테이블 */}
      <div className="rounded-md border overflow-hidden">
        <div className="w-[1334px]">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            onDragStart={handleDragStart}
          >
            <SortableContext
              items={products.map(p => p.product_id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="relative">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow className="hover:bg-muted">
                      <TableHead className="w-[30px] text-center">
                        <Checkbox
                          checked={products.length > 0 && selectedProducts.length === products.length}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedProducts(products.map(p => p.product_id));
                            } else {
                              setSelectedProducts([]);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead className="text-center w-[40px]">번호</TableHead>
                      <TableHead className="text-center w-[70px]">이지어드민</TableHead>
                      <TableHead className="text-center w-[70px]">이미지</TableHead>
                      <TableHead className="text-left w-[195px]">상품명</TableHead>
                      <TableHead className="text-center w-[65px]">판매가</TableHead>
                      <TableHead className="text-center w-[65px]">즉시할인</TableHead>
                      <TableHead className="text-center w-[65px]">쿠폰1</TableHead>
                      <TableHead className="text-center w-[65px]">쿠폰2</TableHead>
                      <TableHead className="text-center w-[65px]">쿠폰3</TableHead>
                      <TableHead className="text-center w-[65px]">최종할인</TableHead>
                      <TableHead className="text-center w-[60px]">원가율</TableHead>
                      <TableHead className="text-center w-[60px]">재고</TableHead>
                      <TableHead className="text-center w-[45px]">드랍</TableHead>
                      <TableHead className="text-center w-[60px]">공급처</TableHead>
                      <TableHead className="text-center w-[60px]">단독</TableHead>
                      <TableHead className="text-center w-[60px]">판매량</TableHead>
                      <TableHead className="text-center w-[50px]">URL</TableHead>
                    </TableRow>
                  </TableHeader>
                </Table>
                <div className="overflow-y-auto max-h-[calc(100vh-400px)]">
                  <Table>
                    <TableBody>
                      {products.map((product, index) => (
                        <SortableTableRow
                          key={product.product_id}
                          product={product}
                          className={selectedProducts.includes(product.product_id) ? 'bg-muted' : ''}
                        >
                          <CheckboxCell
                            product={product}
                            selectedProducts={selectedProducts}
                            onSelect={(checked) => {
                              if (checked) {
                                setSelectedProducts([...selectedProducts, product.product_id]);
                              } else {
                                setSelectedProducts(selectedProducts.filter(id => id !== product.product_id));
                              }
                            }}
                          />
                          <DraggableCell className="text-center w-[40px]">
                            <div>{index + 1}</div>
                          </DraggableCell>
                          <DraggableCell className="text-center w-[65px]">
                            <div>{product.product_id}</div>
                          </DraggableCell>
                          <DraggableCell className="text-center w-[70px]">
                            <div className="flex justify-center">
                              {product.img_desc1 ? (
                                <img
                                  src={product.img_desc1}
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
                              ) : (
                                <div className="w-12 h-12 flex items-center justify-center">
                                  <img 
                                    src="/no-image.png" 
                                    alt="이미지 없음" 
                                    className="w-12 h-12 object-contain rounded-md"
                                    style={{ borderRadius: '5px' }}
                                  />
                                </div>
                              )}
                            </div>
                          </DraggableCell>
                          <TableCell className="text-left w-[200px]">
                            <div className="flex flex-col">
                              <div 
                                className="truncate cursor-pointer hover:underline" 
                                title={product.name}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedProductId(product.product_id);
                                }}
                                style={{ pointerEvents: 'all', touchAction: 'none' }}
                              >
                                {product.name.length > 20 ? `${product.name.substring(0, 20)}...` : product.name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {product.brand && <span className="mr-1">{product.brand}</span>}
                                {product.category_1 && <span className="mr-1">{product.category_1}</span>}
                                {product.extra_column2 && <span className="mr-1">{product.extra_column2}</span>}
                                {product.category_3 && <span className="ml-auto">{product.category_3}</span>}
                              </div>
                            </div>
                          </TableCell>
                          <DraggableCell className="text-center w-[65px]">
                            <div>{product.shop_price?.toLocaleString() || '-'}</div>
                            <div className="text-sm text-muted-foreground">{product.org_price?.toLocaleString() || '-'}</div>
                          </DraggableCell>
                          <DraggableCell className="text-center w-[65px]">
                            <div>{product.discount_price?.toLocaleString() || '-'}</div>
                            <div className="text-sm text-muted-foreground">
                              {product.discount_price && product.shop_price 
                                ? `${Math.round(((product.shop_price - product.discount_price) / product.shop_price) * 100)}%`
                                : '-'}
                            </div>
                          </DraggableCell>
                          <DraggableCell className="text-center w-[65px]">
                            <div>{product.coupon1_price ? product.coupon1_price.toLocaleString() : "-"}</div>
                            <div className="text-sm text-muted-foreground">
                              {product.coupon1_price && product.discount_price
                                ? `${Math.round(((product.discount_price - product.coupon1_price) / product.discount_price) * 100)}%`
                                : '-'}
                            </div>
                          </DraggableCell>
                          <DraggableCell className="text-center w-[65px]">
                            <div>{product.coupon2_price ? product.coupon2_price.toLocaleString() : "-"}</div>
                            <div className="text-sm text-muted-foreground">
                              {product.coupon2_price && product.coupon1_price
                                ? `${Math.round(((product.coupon1_price - product.coupon2_price) / product.coupon1_price) * 100)}%`
                                : '-'}
                            </div>
                          </DraggableCell>
                          <DraggableCell className="text-center w-[65px]">
                            <div>{product.coupon3_price ? product.coupon3_price.toLocaleString() : "-"}</div>
                            <div className="text-sm text-muted-foreground">
                              {product.coupon3_price && product.coupon2_price
                                ? `${Math.round(((product.coupon2_price - product.coupon3_price) / product.coupon2_price) * 100)}%`
                                : '-'}
                            </div>
                          </DraggableCell>
                          <DraggableCell className="text-center w-[65px]">
                            <div> 
                              {product.coupon3_price ? product.coupon3_price.toLocaleString() :
                               product.coupon2_price ? product.coupon2_price.toLocaleString() :
                               product.coupon1_price ? product.coupon1_price.toLocaleString() :
                               product.discount_price?.toLocaleString() || '-'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {product.coupon3_price && product.shop_price
                                ? `${Math.round(((product.shop_price - product.coupon3_price) / product.shop_price) * 100)}%`
                                : product.coupon2_price && product.shop_price
                                ? `${Math.round(((product.shop_price - product.coupon2_price) / product.shop_price) * 100)}%`
                                : product.coupon1_price && product.shop_price
                                ? `${Math.round(((product.shop_price - product.coupon1_price) / product.shop_price) * 100)}%`
                                : product.discount_price && product.shop_price
                                ? `${Math.round(((product.shop_price - product.discount_price) / product.shop_price) * 100)}%`
                                : '-'}
                            </div>
                          </DraggableCell>
                          <DraggableCell className="text-center w-[60px]">
                            <div>{product.cost_ratio ? `${product.cost_ratio}%` : '-'}</div>
                          </DraggableCell>
                          <DraggableCell className="text-center w-[60px]">
                            <div>{(product.total_stock !== undefined 
                              ? product.total_stock 
                              : product.main_wh_available_stock_excl_production_stock)?.toLocaleString() || '-'}</div>
                            <div className="text-sm text-gray-500 mt-1">{product.soldout_rate ? `${product.soldout_rate}%` : '-'}</div>
                          </DraggableCell>
                          <DraggableCell className="text-center w-[45px]">
                            <div>{product.drop_yn || '-'}</div>
                          </DraggableCell>
                          <DraggableCell className="text-center w-[60px]">
                            <div>{product.supply_name || '-'}</div>
                          </DraggableCell>
                          <DraggableCell className="text-center w-[60px]">
                            <div>{product.exclusive2 || '-'}</div>
                          </DraggableCell>
                          <DraggableCell className="text-center w-[60px]">
                            <div>{product.total_order_qty?.toLocaleString() || '-'}</div>
                          </DraggableCell>
                          <DraggableCell className="text-center w-[50px]">
                            {product.product_desc ? (
                              <a href={product.product_desc} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                링크
                              </a>
                            ) : '-'}
                          </DraggableCell>
                        </SortableTableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div> 

      {/* 리스트저장 버튼 */}
      <div className="flex justify-end mt-4">    
        <Button className="bg-blue-500 text-white hover:bg-blue-600">
          리스트저장
        </Button>
      </div>

      {selectedProductId && (
        <ProductDetailModal
          productId={selectedProductId}
          onClose={() => setSelectedProductId(null)}
        />
      )}

      {/* 할인 적용 모달 */}
      <Dialog open={showDiscountModal} onOpenChange={setShowDiscountModal}>
        <DialogContent className="sm:max-w-[425px] bg-background">
          <DialogHeader>
            <DialogTitle>할인 적용</DialogTitle>
            <DialogDescription>
              선택한 상품에 할인을 적용합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                className="w-[150px] h-10"
                placeholder="할인값 입력"
              />
              <Select
                value={discountType}
                onValueChange={(value: 'percentage' | 'fixed') => setDiscountType(value)}
              >
                <SelectTrigger className="w-[80px] h-10">
                  <SelectValue placeholder="단위" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">%</SelectItem>
                  <SelectItem value="fixed">원</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleApplyDiscount}>적용</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showExcelSettings && (
        <ExcelSettingsModal
          isOpen={showExcelSettings}
          onClose={() => setShowExcelSettings(false)}
          settings={excelSettings}
          onSettingsChange={setExcelSettings}
        />
      )}

      {/* 쿠폰 모달 */}
      {showCouponModal && (
        <CouponModal
          isOpen={showCouponModal}
          onClose={() => setShowCouponModal(false)}
          onApply={handleApplyCoupons}
        />
      )}
    </div>
  )
} 