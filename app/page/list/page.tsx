'use client'

import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table"
import { Button } from "@/app/components/ui/button"
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getSession } from '@/app/actions/auth';
import { ProductDetailModal } from "@/app/components/product-detail-modal"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select"
import { Checkbox } from "@/app/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { v4 as uuidv4 } from 'uuid';
import { Search, FileDown, Settings } from "lucide-react"
import * as XLSX from 'xlsx';
import { ExcelSettingsModal } from "@/app/components/excel-settings-modal"
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
import { DiscountModal } from "@/app/components/coupon-discount-modal"
import { ImmediateDiscountModal } from "@/app/components/immediate-discount-modal"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog"
import { Label } from "@/app/components/ui/label"
import { Input } from "@/app/components/ui/input"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/app/components/ui/tabs"
import { Slider } from "@/app/components/ui/slider"
import { DividerModal } from '@/app/components/divider-modal';
import {
  Product,
  Column,
  Filters,
  ChannelInfo,
  CartItem,
  ExcelSettings,
  DividerRule
} from '@/app/types/cart';
import { TabState } from "@/app/components/coupon-discount-modal"
import { Switch } from "@/app/components/ui/switch"
import { ListTopbar } from "@/app/components/list-topbar"


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
      // 체크박스 셀(index 0)과 상품명 셀(index 4)에만 드래그 속성을 전달하지 않음
      if (index === 0 || index === 4) {
        return child;
      }
      // 1번째와 2번째 셀에만 배경색 적용
      if (index === 0 || index === 1) {
        return React.cloneElement(child as React.ReactElement<any>, { 
          ...attributes, 
          ...listeners,
          style: { backgroundColor: product.rowColor || 'transparent' }
        });
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
function CheckboxCell({ product, selectedProducts, onSelect, ...props }: { 
  product: Product; 
  selectedProducts: string[];
  onSelect: (checked: boolean) => void;
} & React.HTMLAttributes<HTMLTableCellElement>) {
  return (
    <TableCell 
      className="text-center w-[30px] align-middle" 
      style={{ backgroundColor: product.rowColor || 'transparent' }}
      {...props}
    >
      <div 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className="flex items-center justify-center"
      >
        <Checkbox 
          checked={selectedProducts.includes(product.product_id)}
          onCheckedChange={(checked) => {
            if (checked) {
              onSelect(true);
            } else {
              onSelect(false);
            }
          }}
        />
      </div>
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
    channel_name_2: '',
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
  const [discountType, setDiscountType] = useState<'amount' | 'rate' | 'min_profit_amount' | 'min_profit_rate'>('amount');
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
  const [discountBase, setDiscountBase] = useState<string>('pricing_price');
  const [discountCap, setDiscountCap] = useState<number>(0);
  const [selfRatio, setSelfRatio] = useState<number>(0);
  const [roundUnit, setRoundUnit] = useState<string>('none');
  const [roundType, setRoundType] = useState<'floor' | 'ceil'>('floor');
  const [hurdleTarget, setHurdleTarget] = useState<string>('pricing_price');
  const [hurdleAmount, setHurdleAmount] = useState<number>(0);
  const [feeRange, setFeeRange] = useState<number[]>([0, 0]);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [showDividerModal, setShowDividerModal] = useState(false);
  const [dividerRules, setDividerRules] = useState<DividerRule[]>([
    { id: uuidv4(), range: [0, 0] as [number, number], color: '#FFE4E1', text: '' },
    { id: uuidv4(), range: [0, 0] as [number, number], color: '#FFE4E1', text: '' },
    { id: uuidv4(), range: [0, 0] as [number, number], color: '#FFE4E1', text: '' }
  ]);
  const [showImmediateDiscountModal, setShowImmediateDiscountModal] = useState(false);
  const [showCouponDiscountModal, setShowCouponDiscountModal] = useState(false);
  const [memo1, setMemo1] = useState<string>('');
  const [memo2, setMemo2] = useState<string>('');
  const [memo3, setMemo3] = useState<string>('');
  const [isAdjustFeeEnabled, setIsAdjustFeeEnabled] = useState(false);

  // 각 탭별 상태 변수들
  const [tabStates, setTabStates] = useState<{
    [key: string]: {
      hurdleTarget: string;
      hurdleAmount: number;
      discountBase: string;
      discountType: 'amount' | 'rate';
      discountValue: number;
      roundUnit: string;
      roundType: 'floor' | 'ceil';
      discountCap: number;
      selfRatio: number;
    }
  }>({
    tab1: {
      hurdleTarget: 'pricing_price',
      hurdleAmount: 0,
      discountBase: 'pricing_price',
      discountType: 'amount',
      discountValue: 0,
      roundUnit: 'none',
      roundType: 'floor',
      discountCap: 0,
      selfRatio: 0
    },
    tab2: {
      hurdleTarget: 'pricing_price',
      hurdleAmount: 0,
      discountBase: 'pricing_price',
      discountType: 'amount',
      discountValue: 0,
      roundUnit: 'none',
      roundType: 'floor',
      discountCap: 0,
      selfRatio: 0
    },
    tab3: {
      hurdleTarget: 'pricing_price',
      hurdleAmount: 0,
      discountBase: 'pricing_price',
      discountType: 'amount',
      discountValue: 0,
      roundUnit: 'none',
      roundType: 'floor',
      discountCap: 0,
      selfRatio: 0
    },
    tab4: {
      hurdleTarget: 'pricing_price',
      hurdleAmount: 0,
      discountBase: 'pricing_price',
      discountType: 'amount',
      discountValue: 0,
      roundUnit: 'none',
      roundType: 'floor',
      discountCap: 0,
      selfRatio: 0
    }
  });

  // 현재 선택된 탭
  const [currentTab, setCurrentTab] = useState('tab1');

  // 탭 변경 핸들러
  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
  };

  // 탭별 상태 업데이트 핸들러
  const handleTabStateChange = (tab: string, field: string, value: any) => {
    setTabStates(prev => ({
      ...prev,
      [tab]: {
        ...prev[tab],
        [field]: value
      }
    }));
  };

  // 현재 탭의 상태 가져오기
  const getCurrentTabState = () => {
    return tabStates[currentTab];
  };

  // 할인 타입 타입 정의
  type DiscountType = 'amount' | 'rate' | 'min_profit_amount' | 'min_profit_rate';

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

  // 정보 저장 함수
  const saveCartInfo = async () => {
    if (!user) return;

    try {
      const cartData = {
        products: products.map(product => {
          const cleanProduct = { ...product };
          Object.keys(cleanProduct).forEach(key => {
            if (cleanProduct[key as keyof Product] === undefined) {
              delete cleanProduct[key as keyof Product];
            }
          });
          return cleanProduct;
        }),
        title: title || '',
        channel_name_2: filters.channel_name_2 || '',
        delivery_type: filters.delivery_type || '',
        start_date: startDate || '',
        end_date: endDate || '',
        memo1: memo1 || '',
        memo2: memo2 || '',
        memo3: memo3 || '',
        divider_rules: dividerRules.map(rule => ({
          id: rule.id,
          range: rule.range,
          color: rule.color || '#FFE4E1',
          text: rule.text || ''
        })),
        updatedAt: new Date().toISOString()
      };

      const docRef = doc(db, 'userCarts', user.uid);
      await setDoc(docRef, cartData);
    } catch (error) {
      console.error('장바구니 정보 저장 중 오류:', error);
    }
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
          
          // 데이터 유효성 검사 추가
          if (data && typeof data === 'object') {
            // products 배열 처리
            if (Array.isArray(data.products)) {
              setProducts(data.products);
            }
            
            // 문자열 데이터 처리
            if (typeof data.title === 'string') setTitle(data.title);
            if (typeof data.channel_name_2 === 'string') {
              setChannelSearchTerm(data.channel_name_2);
              setFilters(prev => ({ ...prev, channel_name_2: data.channel_name_2 }));
            }
            if (typeof data.delivery_type === 'string') {
              setDeliveryType(data.delivery_type);
              setFilters(prev => ({ ...prev, delivery_type: data.delivery_type }));
            }
            if (typeof data.start_date === 'string') setStartDate(data.start_date);
            if (typeof data.end_date === 'string') setEndDate(data.end_date);
            if (typeof data.memo1 === 'string') setMemo1(data.memo1);
            if (typeof data.memo2 === 'string') setMemo2(data.memo2);
            if (typeof data.memo3 === 'string') setMemo3(data.memo3);
            
            // divider_rules 배열 처리
            if (Array.isArray(data.divider_rules)) {
              const validRules = data.divider_rules.filter(rule => 
                rule && 
                typeof rule === 'object' && 
                Array.isArray(rule.range) && 
                rule.range.length === 2
              );
              setDividerRules(validRules);
            } else {
              setDividerRules([
                { id: uuidv4(), range: [0, 0] as [number, number], color: '#FFE4E1', text: '' },
                { id: uuidv4(), range: [0, 0] as [number, number], color: '#FFE4E1', text: '' },
                { id: uuidv4(), range: [0, 0] as [number, number], color: '#FFE4E1', text: '' }
              ]);
            }
          }
        }
      } catch (error) {
        console.error('세션 또는 장바구니 데이터 로드 오류:', error);
        // 오류 발생 시 기본값으로 초기화
        setProducts([]);
        setTitle('');
        setChannelSearchTerm('');
        setDeliveryType('');
        setStartDate('');
        setEndDate('');
        setMemo1('');
        setMemo2('');
        setMemo3('');
        setFilters({
          channel_name_2: '',
          delivery_type: ''
        });
        setDividerRules([
          { id: uuidv4(), range: [0, 0] as [number, number], color: '#FFE4E1', text: '' },
          { id: uuidv4(), range: [0, 0] as [number, number], color: '#FFE4E1', text: '' },
          { id: uuidv4(), range: [0, 0] as [number, number], color: '#FFE4E1', text: '' }
        ]);
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
            const existingChannel = acc.find(c => c.channel_name_2 === curr.channel_name_2);
            if (!existingChannel || (curr.use_yn === '운영중' && existingChannel.use_yn !== '운영중')) {
              if (existingChannel) {
                const index = acc.findIndex(c => c.channel_name_2 === curr.channel_name_2);
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
          channel.channel_name_2.toLowerCase().includes(channelSearchTerm.toLowerCase())
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
    const foundChannel = channels.find(c => c.channel_name_2 === value);
    if (foundChannel) {
      setIsValidChannel(true);
      setSelectedChannelInfo(foundChannel);
      // 채널이 선택되면 판매가 다시 계산
      handleChannelSelect(foundChannel);
    } else {
      setIsValidChannel(false);
      setSelectedChannelInfo(null);
    }
  };

  // 물류비 계산 함수 수정
  const calculateLogisticsCost = (
    channel: ChannelInfo,
    deliveryType: string,
    amazonShippingCost?: number
  ): number => {
    // 환율 변환 (쉼표 제거 후 숫자로 변환)
    const exchangeRate = Number(channel.applied_exchange_rate?.replace(/,/g, '') || 0);
    
    console.log('물류비 계산 시작:', {
      channel_name: channel.channel_name_2,
      delivery_type: deliveryType,
      exchange_rate: exchangeRate,
      free_shipping: channel.free_shipping,
      conditional_shipping: channel.conditional_shipping,
      amazon_shipping_cost: amazonShippingCost
    });
    
    // SG_아마존US & 무료배송
    if (channel.channel_name_2 === 'SG_아마존US' && deliveryType === 'free') {
      const result = (amazonShippingCost || 0) * 2;
      console.log('아마존 무료배송 결과:', result);
      return result;
    }
    
    // SG_아마존US & 조건부배송
    if (channel.channel_name_2 === 'SG_아마존US') {
      const result = amazonShippingCost || 0;
      console.log('아마존 조건부배송 결과:', result);
      return result;
    }
    
    // 일반 무료배송
    if (deliveryType === 'free') {
      const freeShipping = channel.free_shipping
        ? Number(String(channel.free_shipping).replace(/,/g, ''))
        : 0;
      const result = exchangeRate > 0 ? freeShipping / exchangeRate : 0;
      console.log('일반 무료배송 계산:', {
        free_shipping: freeShipping,
        exchange_rate: exchangeRate,
        result: result
      });
      return result;
    }
    
    // 일반 조건부배송
    const conditionalShipping = channel.conditional_shipping
      ? Number(String(channel.conditional_shipping).replace(/,/g, ''))
      : 0;
    const result = exchangeRate > 0 ? conditionalShipping / exchangeRate : 0;
    console.log('일반 조건부배송 계산:', {
      conditional_shipping: conditionalShipping,
      exchange_rate: exchangeRate,
      result: result
    });
    return result;
  };

  // 예상수수료 계산 함수 수정
  const calculateExpectedCommissionFee = (
    product: Product, 
    adjustByDiscount: boolean = isAdjustFeeEnabled,
    channelInfo: ChannelInfo | null = selectedChannelInfo
  ) => {
    const pricingPrice = Number(product.pricing_price) || 0;
    const discountPrice = Number(product.discount_price) || 0;
    
    const averageFeeRate = channelInfo?.average_fee_rate ? parseFloat(String(channelInfo.average_fee_rate)) : 0;

    // 최종 가격 결정 (즉시할인가가 있으면 즉시할인가, 없으면 판매가)
    const finalPrice = discountPrice > 0 ? discountPrice : pricingPrice;

    // 할인율 계산 (0~1 사이 값)
    const discountRatio = pricingPrice > 0 ? (pricingPrice - finalPrice) / pricingPrice : 0;

    // 수수료율 조정 - 스위치가 켜져있을 때만 할인율에 따른 차감 적용
    let adjustedFeeRate = averageFeeRate;
    if (adjustByDiscount && discountRatio > 0) {
      const feeRateReduction = Math.floor(discountRatio * 100 / 10);
      adjustedFeeRate = Math.max(averageFeeRate - feeRateReduction, 0);
    }

    // 최종 수수료 계산
    const commissionFee = finalPrice * (adjustedFeeRate / 100);
    return Math.round(commissionFee);
  };

  // 예상순이익 계산 함수 추가
  const calculateExpectedNetProfit = (product: Product) => {
    // 예상정산금액
    const expectedSettlementAmount = product.expected_settlement_amount || 0;
    
    // 원가 (조정원가가 있으면 조정원가, 없으면 기본 원가)
    const cost = product.adjusted_cost || product.org_price || 0;
    
    // 물류비용
    const logisticsCost = product.logistics_cost || 0;

    // 예상순이익 = 예상정산금액 - 원가 - 물류비용
    return expectedSettlementAmount - cost - logisticsCost;
  };

  // 예상순이익률 계산 함수 수정
  const calculateExpectedNetProfitMargin = (product: Product) => {
    const pricingPrice = product.pricing_price || 0;
    if (pricingPrice === 0) return 0;

    // SQL의 SAFE_DIVIDE 로직과 동일하게 구현
    // expected_net_profit_margin = (expected_settlement_amount - COALESCE(adjusted_cost, org_price) - logistics_cost) / pricing_price
    const expectedSettlementAmount = product.expected_settlement_amount || 0;
    const cost = product.adjusted_cost || product.org_price || 0;
    const logisticsCost = product.logistics_cost || 0;

    const expectedNetProfit = expectedSettlementAmount - cost - logisticsCost;
    return expectedNetProfit / pricingPrice;
  };

  // 정산예정금액 계산 함수 추가
  const calculateExpectedSettlementAmount = (product: Product) => {
    const pricingPrice = product.pricing_price || 0;
    // 최종할인 컬럼과 동일한 로직 적용
    const finalDiscountPrice = product.discount_price || null;
    const expectedCommissionFee = product.expected_commission_fee || 0;
    const discountBurdenAmount = product.discount_burden_amount || 0;
  
    return finalDiscountPrice === null
      ? pricingPrice - expectedCommissionFee - discountBurdenAmount
      : finalDiscountPrice - expectedCommissionFee - discountBurdenAmount;
  };
  // handleChannelSelect 함수 수정
  const handleChannelSelect = async (channel: ChannelInfo) => {
    try {
      console.log('선택된 채널 정보:', {
        channel_name_2: channel.channel_name_2,
        type: channel.type,
        markup_ratio: channel.markup_ratio,
        applied_exchange_rate: channel.applied_exchange_rate,
        rounddown: channel.rounddown,
        digit_adjustment: channel.digit_adjustment,
        amazon_shipping_cost: channel.amazon_shipping_cost
      });

      setChannelSearchTerm(channel.channel_name_2);
      setShowChannelSuggestions(false);
      setIsValidChannel(true);
      setFilters(prev => ({
        ...prev,
        channel_name_2: channel.channel_name_2
      }));
      setSelectedChannelInfo(channel);
      
      // 판매가와 물류비 계산
      const updatedProducts = products.map(product => {
        let pricingPrice: number | null = null;
        let adjustedCost: number | null = null;

        // 채널 정보의 모든 값이 있는지 확인
        if (!channel.type || !channel.markup_ratio || !channel.applied_exchange_rate) {
          console.log('채널 정보 누락:', {
            type: channel.type,
            markup_ratio: channel.markup_ratio,
            applied_exchange_rate: channel.applied_exchange_rate
          });
          return {
            ...product,
            pricing_price: null,
            logistics_cost: undefined,
            adjusted_cost: null
          };
        }

        // 환율 변환
        const exchangeRate = Number(channel.applied_exchange_rate.replace(/,/g, ''));

        // markup_ratio에서 콤마 제거하고 숫자로 변환
        const markupRatio = Number(channel.markup_ratio.replace(/,/g, ''));

        // 타입칸에 표시되는 채널 타입에 따라 판매가 계산
        if (channel.type === '일본' || channel.type === '자사몰') {
          if (channel.rounddown !== null) {
            // SQL의 ROUND 함수와 동일한 로직으로 수정
            const basePrice = product.global_price / exchangeRate;
            const multiplier = Math.pow(10, Number(channel.rounddown));
            pricingPrice = Math.floor(basePrice * multiplier) / multiplier;
            pricingPrice += Number(channel.digit_adjustment || 0);
            if (channel.channel_name_2 === 'SG_아마존US') {
              pricingPrice += Number(channel.amazon_shipping_cost || 0);
            }
          }
        }
        // 국내
        else if (channel.type === '국내') {
          pricingPrice = product.shop_price + markupRatio;
        }
        // 해외
        else if (channel.type === '해외' && channel.rounddown !== null) {
          pricingPrice = Math.floor(
            (product.shop_price * markupRatio) / exchangeRate
          );
          pricingPrice += Number(channel.digit_adjustment || 0);

          // ZALORA 특별 케이스
          if (channel.channel_name_2 === 'SG_ZALORA_SG') {
            pricingPrice *= 1.09;
          } else if (channel.channel_name_2 === 'SG_ZALORA_MY') {
            pricingPrice *= 1.1;
          }
        }

        // 물류비 계산
        const logisticsCost = calculateLogisticsCost(channel, deliveryType, Number(channel.amazon_shipping_cost));

        const newProduct = {
          ...product,
          pricing_price: pricingPrice,
          logistics_cost: logisticsCost,
          adjusted_cost: adjustedCost
        };

        // 예상수수료 계산
        newProduct.expected_commission_fee = calculateExpectedCommissionFee(newProduct);

        // 정산예정금액 계산
        newProduct.expected_settlement_amount = calculateExpectedSettlementAmount(newProduct);

        // 예상순이익 및 예상순이익률 계산
        newProduct.expected_net_profit = calculateExpectedNetProfit(newProduct);
        newProduct.expected_net_profit_margin = calculateExpectedNetProfitMargin(newProduct);

        return newProduct;
      });

      setProducts(updatedProducts);
      await saveCartInfo();
    } catch (error) {
      console.error('채널 선택 중 오류 발생:', error);
    }
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

  // 드래그 종료 핸들러
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setIsDragging(false);
    
    if (over && active.id !== over.id) {
      const oldIndex = products.findIndex((item) => item.product_id === active.id);
      const newIndex = products.findIndex((item) => item.product_id === over.id);
      
      const newProducts = arrayMove(products, oldIndex, newIndex);
      setProducts(newProducts);
      await saveCartInfo();
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

  // 타이틀 변경 핸들러
  const handleTitleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTitle(value);
    await saveCartInfo();
  };

  // handleDeliveryTypeChange 함수 수정
  const handleDeliveryTypeChange = async (value: string) => {
    setDeliveryType(value);
    setIsValidDeliveryType(true);
    setFilters(prev => ({
      ...prev,
      delivery_type: value
    }));

    // 선택된 채널이 있고, 채널 정보가 있는 경우에만 물류비 재계산
    if (selectedChannelInfo) {
      const updatedProducts = products.map(product => ({
        ...product,
        logistics_cost: calculateLogisticsCost(selectedChannelInfo, value, Number(selectedChannelInfo.amazon_shipping_cost))
      }));
      setProducts(updatedProducts);
    }

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

  // 메모 변경 핸들러들
  const handleMemo1Change = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMemo1(value);
    await saveCartInfo();
  };

  const handleMemo2Change = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMemo2(value);
    await saveCartInfo();
  };

  const handleMemo3Change = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMemo3(value);
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

  // 절사 처리 함수
  const roundWithType = (value: number, unit: string, type: 'floor' | 'ceil'): number => {
    if (unit === 'none' || !unit) return value;
    const unitValue = parseInt(unit);
    if (type === 'ceil') return Math.ceil(value / unitValue) * unitValue;
    return Math.floor(value / unitValue) * unitValue;
  };

  // 할인 적용 핸들러
   

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
          channel_name_2: '',
          delivery_type: '',
          start_date: '',
          end_date: '',
          memo1: '',
          memo2: '',
          memo3: '',
          divider_rules: [
            { id: uuidv4(), range: [0, 0] as [number, number], color: '#FFE4E1', text: '' },
            { id: uuidv4(), range: [0, 0] as [number, number], color: '#FFE4E1', text: '' },
            { id: uuidv4(), range: [0, 0] as [number, number], color: '#FFE4E1', text: '' }
          ],
          updatedAt: new Date().toISOString()
        });

        // 로컬 상태 초기화
        setProducts([]);
        setTitle('');
        setChannelSearchTerm('');
        setDeliveryType('');
        setStartDate('');
        setEndDate('');
        setMemo1('');
        setMemo2('');
        setMemo3('');
        setFilters({
          channel_name_2: '',
          delivery_type: ''
        });
        setSelectedProducts([]);
        setSelectedChannelInfo(null);
        setIsValidChannel(true);
        setIsValidDeliveryType(true);
        setDividerRules([
          { id: uuidv4(), range: [0, 0] as [number, number], color: '#FFE4E1', text: '' },
          { id: uuidv4(), range: [0, 0] as [number, number], color: '#FFE4E1', text: '' },
          { id: uuidv4(), range: [0, 0] as [number, number], color: '#FFE4E1', text: '' }
        ]);

        alert('리스트가 초기화되었습니다.');
      }
    } catch (error) {
      console.error('리스트 초기화 중 오류 발생:', error);
      alert('리스트 초기화 중 오류가 발생했습니다.');
    }
  };

  // 할인 초기화 핸들러 추가
  const handleResetDiscount = async () => {
    if (!confirm('모든 할인을 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    try {
      const updatedProducts = products.map(product => {
        const newProduct = { ...product };
        delete newProduct.discount_price;
        delete newProduct.discount;
        delete newProduct.discount_rate;
        delete newProduct.discount_unit;
        delete newProduct.coupon_price_1;
        delete newProduct.coupon_price_2;
        delete newProduct.coupon_price_3;
        delete newProduct.self_ratio;
        delete newProduct.discount_burden_amount;
        delete newProduct.expected_commission_fee;
        return newProduct;
      });

      setProducts(updatedProducts);
      
      // 할인 모달 상태 초기화
      setTabStates({
        tab1: {
          hurdleTarget: 'pricing_price',
          hurdleAmount: 0,
          discountBase: 'pricing_price',
          discountType: 'amount',
          discountValue: 0,
          roundUnit: 'none',
          roundType: 'floor',
          discountCap: 0,
          selfRatio: 0
        },
        tab2: {
          hurdleTarget: 'pricing_price',
          hurdleAmount: 0,
          discountBase: 'pricing_price',
          discountType: 'amount',
          discountValue: 0,
          roundUnit: 'none',
          roundType: 'floor',
          discountCap: 0,
          selfRatio: 0
        },
        tab3: {
          hurdleTarget: 'pricing_price',
          hurdleAmount: 0,
          discountBase: 'pricing_price',
          discountType: 'amount',
          discountValue: 0,
          roundUnit: 'none',
          roundType: 'floor',
          discountCap: 0,
          selfRatio: 0
        },
        tab4: {
          hurdleTarget: 'pricing_price',
          hurdleAmount: 0,
          discountBase: 'pricing_price',
          discountType: 'amount',
          discountValue: 0,
          roundUnit: 'none',
          roundType: 'floor',
          discountCap: 0,
          selfRatio: 0
        }
      });
      
      if (user) {
        const docRef = doc(db, 'userCarts', user.uid);
        await setDoc(docRef, {
          products: updatedProducts,
          updatedAt: new Date().toISOString()
        });
      }

      alert('할인이 초기화되었습니다.');
    } catch (error) {
      console.error('할인 초기화 중 오류 발생:', error);
      alert('할인 초기화 중 오류가 발생했습니다.');
    }
  };

  const columns: Column[] = [
    { key: 'actions', label: '삭제' },
    { key: "img_desc1", label: "이미지" },
    { key: "name", label: "상품명" },
    { key: "org_price", label: "원가", format: (value: number) => value?.toLocaleString() || '-' },
    { key: "shop_price", label: "판매가", format: (value: number) => value?.toLocaleString() || '-' },
    { key: "pricing_price", label: "채널가", format: (value: number) => value?.toLocaleString() || '-' },
    { key: "cost_ratio", label: "원가율", format: (value: number) => value?.toLocaleString() || '-' },
    { key: "total_stock", label: "재고", format: (value: number) => value?.toLocaleString() || '-' },
    { key: "soldout_rate", label: "품절률", format: (value: number) => value ? `${value}%` : '-' },
    { key: "drop_yn", label: "드랍여부" },
    { key: "supply_name", label: "공급처명" },
    { key: "exclusive2", label: "단독여부" },
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
    { key: "discount_burden_amount", label: "할인부담액", format: (value: number) => value?.toLocaleString() || '-' },
    { key: "adjusted_cost", label: "조정원가", format: (value: number) => value?.toLocaleString() || '-' },
    { key: "expected_commission_fee", label: "예상수수료", format: (value: number) => value?.toLocaleString() || '-' },
    { key: "logistics_cost", label: "물류비", format: (value: number) => value?.toLocaleString() || '-' },
    { key: "expected_net_profit", label: "예상순이익액", format: (value: number) => value?.toLocaleString() || '-' },
    { key: "expected_net_profit_margin", label: "예상순이익률", format: (value: number) => value ? `${(value * 100).toFixed(1)}%` : '-' },
    { key: "expected_settlement_amount", label: "정산예정금액", format: (value: number) => value?.toLocaleString() || '-' },
    { key: "cost_ratio", label: "원가율", format: (value: number) => value?.toLocaleString() || '-' },
    { key: "total_stock", label: "재고", format: (value: number) => value?.toLocaleString() || '-' },
    { key: "drop_yn", label: "드랍", format: (value: string) => value || '-' },
    { key: "supply_name", label: "공급처", format: (value: string) => value || '-' },
    { key: "exclusive2", label: "단독", format: (value: string) => value || '-' },
    { key: "actions", label: "작업" },
  ];

  // 색상 적용 핸들러
  const handleApplyColor = () => {
    if (!selectedColor || products.length === 0) return;

    const [min, max] = feeRange;
    const updatedProducts = products.map((product, index) => {
      if (index + 1 >= min && index + 1 <= max) {
        return {
          ...product,
          rowColor: selectedColor
        };
      }
      return product;
    });

    setProducts(updatedProducts);
    
    // Firebase에 저장
    if (user) {
      const docRef = doc(db, 'userCarts', user.uid);
      setDoc(docRef, {
        products: updatedProducts,
        updatedAt: new Date().toISOString()
      });
    }
    
    setColorPickerOpen(false);
    setSelectedColor('');
    setFeeRange([0, 0]);
  };

  // 구분자 규칙 추가
  const handleAddDividerRule = () => {
    setDividerRules([...dividerRules, { id: uuidv4(), range: [0, 0], color: '', text: '' }]);
  };

  // 구분자 규칙 제거
  const handleRemoveDividerRule = (id: string) => {
    setDividerRules(dividerRules.filter(rule => rule.id !== id));
  };

  // 구분자 규칙 업데이트 핸들러
  const handleUpdateDividerRule = async (id: string, field: keyof DividerRule, value: any) => {
    const updatedRules = dividerRules.map(rule =>
      rule.id === id ? { ...rule, [field]: value } : rule
    );
    setDividerRules(updatedRules);
    
    // 파이어스토어에 업데이트
    if (user) {
      try {
        const docRef = doc(db, 'userCarts', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const currentData = docSnap.data();
          await setDoc(docRef, {
            ...currentData,
            divider_rules: updatedRules,
            updatedAt: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('구분자 규칙 업데이트 중 오류:', error);
      }
    }
  };

  // 구분자 적용
  const handleApplyDivider = async () => {
    const updatedProducts = products.map((product, index) => {
      const matchingRule = dividerRules.find(rule => 
        index + 1 >= rule.range[0] && index + 1 <= rule.range[1]
      );
      
      return {
        ...product,
        rowColor: matchingRule?.color || undefined,
        dividerText: matchingRule?.text || undefined
      };
    });

    setProducts(updatedProducts);
    setShowDividerModal(false);
    await saveCartInfo();
  };

  // 구분자 초기화 핸들러
  const handleResetDividerRules = async () => {
    try {
      const defaultRules = [
        { id: uuidv4(), range: [0, 0] as [number, number], color: '#fef9c3', text: '' },
        { id: uuidv4(), range: [0, 0] as [number, number], color: '#d1fae5', text: '' },
        { id: uuidv4(), range: [0, 0] as [number, number], color: '#dbeafe', text: '' }
      ];

      setDividerRules(defaultRules);

      // 파이어스토어 업데이트
      if (user) {
        const docRef = doc(db, 'userCarts', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const currentData = docSnap.data();
          await setDoc(docRef, {
            ...currentData,
            divider_rules: defaultRules,
            updatedAt: new Date().toISOString()
          });
        }
      }

      // 상품들의 배경색과 텍스트 초기화
      const updatedProducts = products.map(product => ({
        ...product,
        rowColor: undefined,
        dividerText: undefined
      }));
      
      setProducts(updatedProducts);
    } catch (error) {
      console.error('구분자 초기화 중 오류 발생:', error);
      alert('구분자 초기화 중 오류가 발생했습니다.');
    }
  };

  const handleApplyDiscount = async (updatedProducts: Product[]) => {
    setProducts(updatedProducts);
    if (user) {
      const docRef = doc(db, 'userCarts', user.uid);
      setDoc(docRef, {
        products: updatedProducts,
        updatedAt: new Date().toISOString()
      });
    }
  };

  // 예상수수료율 계산 함수
  const calculateExpectedFeeRate = (channel: ChannelInfo, price: number): number => {
    if (!channel.average_fee_rate) return 0;
    
    // 문자열을 숫자로 변환
    const averageFeeRate = Number(channel.average_fee_rate);
    
    console.log('예상수수료율 계산:', {
      channel_name: channel.channel_name_2,
      original_average_fee_rate: channel.average_fee_rate,
      converted_average_fee_rate: averageFeeRate,
      price: price
    });
    
    // 평균 수수료율이 0.15(15%)인 경우
    if (averageFeeRate === 0.15) {
      // 가격이 10000원 미만이면 0.15(15%)
      if (price < 10000) return 0.15;
      // 가격이 10000원 이상이면 0.12(12%)
      return 0.12;
    }
    
    // 평균 수수료율이 0.12(12%)인 경우
    if (averageFeeRate === 0.12) {
      // 가격이 10000원 미만이면 0.12(12%)
      if (price < 10000) return 0.12;
      // 가격이 10000원 이상이면 0.08(8%)
      return 0.08;
    }
    
    // 그 외의 경우 평균 수수료율 그대로 사용
    return averageFeeRate;
  };

  // 스위치 상태 변경 핸들러
  const handleAdjustFeeChange = async (checked: boolean) => {
    setIsAdjustFeeEnabled(checked);
    if (selectedChannelInfo) {
      const updatedProducts = products.map(product => ({
        ...product,
        expected_commission_fee: calculateExpectedCommissionFee(product, checked)
      }));
      setProducts(updatedProducts);
      await saveCartInfo();
    }
  };

  return (
    <>
      <ListTopbar />
      <div className="container mx-auto py-10 bg-white rounded-lg shadow-sm">
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
                          key={channel.channel_name_2}
                          className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                          onClick={() => handleChannelSelect(channel as ChannelInfo)}
                        >
                          {channel.channel_name_2}
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
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={selectedChannelInfo?.average_fee_rate ? `평균수수료 : ${selectedChannelInfo.average_fee_rate}` : ''}
                    readOnly
                    placeholder="평균수수료"
                    className="w-[160px] h-10 px-3 border-[1px] rounded-md shadow-sm bg-muted text-sm text-muted-foreground"
                  />
                  <Label className="text-sm text-muted-foreground">할인 수수료</Label>
                  <Switch
                    checked={isAdjustFeeEnabled}
                    onCheckedChange={handleAdjustFeeChange}
                    className="ml-2"
                  />
                </div>
                <div className="flex gap-2">
                  {dividerRules.map((rule, index) => (
                    rule.range[0] > 0 && rule.range[1] > 0 && (
                      <div 
                        key={rule.id} 
                        className="flex items-center gap-2 px-3 h-10 border-[1px] rounded-md shadow-sm bg-muted text-sm"
                        style={{ backgroundColor: rule.color || '#FFE4E1' }}
                      >
                        <span>{rule.range[0]}~{rule.range[1]}</span>
                        {rule.text && <span className="text-muted-foreground">{rule.text}</span>}
                      </div>
                    )
                  ))}
                </div>
              </div>

              {/* 메모 입력창 수정 */}
              <div className="w-full flex gap-4">
                <div className="relative w-full">
                  <textarea
                    value={memo1}
                    onChange={handleMemo1Change}
                    placeholder="메모 1"
                    className="w-full h-10 px-3 py-2 border-[1px] rounded-md shadow-sm focus:outline-none focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 text-sm border-input bg-background resize"
                    style={{ resize: 'both' }}
                  />
                </div>
                <div className="relative w-full">
                  <textarea
                    value={memo.split('\n')[1] || ''}
                    onChange={(e) => {
                      const lines = memo.split('\n');
                      lines[1] = e.target.value;
                      setMemo(lines.join('\n'));
                    }}
                    placeholder="메모 2"
                    className="w-full h-10 px-3 py-2 border-[1px] rounded-md shadow-sm focus:outline-none focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 text-sm border-input bg-background resize"
                    style={{ resize: 'both' }}
                  />
                </div>
                <div className="relative w-full">
                  <textarea
                    value={memo.split('\n')[2] || ''}
                    onChange={(e) => {
                      const lines = memo.split('\n');
                      lines[2] = e.target.value;
                      setMemo(lines.join('\n'));
                    }}
                    placeholder="메모 3"
                    className="w-full h-10 px-3 py-2 border-[1px] rounded-md shadow-sm focus:outline-none focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 text-sm border-input bg-background resize"
                    style={{ resize: 'both' }}
                  />
                </div>
                
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
                onClick={() => setShowImmediateDiscountModal(true)}
                className="border-0 hover:bg-transparent hover:text-primary"
              >
                기간할인
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCouponDiscountModal(true)}
                className="border-0 hover:bg-transparent hover:text-primary"
              >
                쿠폰할인
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDividerModal(true)}
                className="border-0 hover:bg-transparent hover:text-primary"
              >
                구분자
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
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetDiscount}
                className="border-0 hover:bg-transparent hover:text-primary"
              >
                할인 초기화
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
                <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
                  <Table style={{overflowX: 'visible', minWidth: '1800px'}}>
                    <TableHeader className="bg-muted sticky top-0">
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
                        <TableHead className="text-center w-[50px]">번호</TableHead>
                        <TableHead className="text-center w-[80px]">이지어드민</TableHead>
                        <TableHead className="text-center w-[70px]">이미지</TableHead>
                        <TableHead className="text-left w-[200px]">상품명</TableHead>
                        <TableHead className="text-center w-[80px]">판매가</TableHead> 
                        <TableHead className="text-center w-[80px]">즉시할인</TableHead>
                        <TableHead className="text-center w-[80px]">쿠폰1</TableHead>
                        <TableHead className="text-center w-[80px]">쿠폰2</TableHead>
                        <TableHead className="text-center w-[80px]">쿠폰3</TableHead>
                        <TableHead className="text-center w-[80px]">최종할인</TableHead>
                        <TableHead className="text-center w-[80px]">할인부담액</TableHead>
                        <TableHead className="text-center w-[80px]">조정원가</TableHead>
                        <TableHead className="text-center w-[80px]">예상수수료</TableHead>
                        <TableHead className="text-center w-[80px]">물류비</TableHead>
                        <TableHead className="text-center w-[80px]">예상순이익액</TableHead>
                        <TableHead className="text-center w-[80px]">정산예정금액</TableHead>
                        <TableHead className="text-center w-[80px]">원가율</TableHead>
                        <TableHead className="text-center w-[80px]">재고</TableHead>
                        <TableHead className="text-center w-[70px]">드랍</TableHead>
                        <TableHead className="text-center w-[80px]">공급처</TableHead>
                        <TableHead className="text-center w-[80px]">단독</TableHead>
                      </TableRow>
                    </TableHeader>
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
                          <DraggableCell className="text-center">
                            <div>{index + 1}</div>
                          </DraggableCell>
                          <DraggableCell className="text-center">
                            <div>{product.product_id}</div>
                          </DraggableCell>
                          <DraggableCell className="text-center">
                            <div className="flex justify-center" >
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
                          <TableCell className="text-left">
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
                          <DraggableCell className="text-center">
                            <div>{product.pricing_price?.toLocaleString() || '-'}</div>
                            <div className="text-sm text-muted-foreground">
                              {(() => {
                                if (!product.org_price || !selectedChannelInfo) return '-';
                                
                                const exchangeRate = Number(selectedChannelInfo.applied_exchange_rate?.replace(/,/g, '') || 0);
                                const cost = product.org_price / exchangeRate * 
                                  (selectedChannelInfo.type === '국내' ? 1.1 : 1);
                                
                                return Math.round(cost).toLocaleString();
                              })()}
                            </div>
                          </DraggableCell>
                          <DraggableCell className="text-center">
                            <div>{product.discount_price?.toLocaleString() || '-'}</div>
                            <div className="text-sm text-muted-foreground">
                              {product.discount_price && product.pricing_price 
                                ? `${Math.round(((product.pricing_price - product.discount_price) / product.pricing_price) * 100)}%`
                                : '-'}
                            </div>
                          </DraggableCell>
                          <DraggableCell className="text-center">
                            <div>{product.coupon_price_1 ? product.coupon_price_1.toLocaleString() : "-"}</div>
                            <div className="text-sm text-muted-foreground">
                              {product.coupon_price_1 && product.discount_price
                                ? `${Math.round(((product.discount_price - product.coupon_price_1) / product.discount_price) * 100)}%`
                                : '-'}
                            </div>
                          </DraggableCell>
                          <DraggableCell className="text-center">
                            <div>{product.coupon_price_2 ? product.coupon_price_2.toLocaleString() : "-"}</div>
                            <div className="text-sm text-muted-foreground">
                              {product.coupon_price_2 && product.coupon_price_1
                                ? `${Math.round(((product.coupon_price_1 - product.coupon_price_2) / product.coupon_price_1) * 100)}%`
                                : '-'}
                            </div>
                          </DraggableCell>
                          <DraggableCell className="text-center">
                            <div>{product.coupon_price_3 ? product.coupon_price_3.toLocaleString() : "-"}</div>
                            <div className="text-sm text-muted-foreground">
                              {product.coupon_price_3 && product.coupon_price_2
                                ? `${Math.round(((product.coupon_price_2 - product.coupon_price_3) / product.coupon_price_2) * 100)}%`
                                : '-'}
                            </div>
                          </DraggableCell>
                          <DraggableCell className="text-center">
                            <div> 
                              {product.coupon_price_3 ? product.coupon_price_3.toLocaleString() :
                               product.coupon_price_2 ? product.coupon_price_2.toLocaleString() :
                               product.coupon_price_1 ? product.coupon_price_1.toLocaleString() :
                               product.discount_price?.toLocaleString() || '-'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {product.coupon_price_3 && product.pricing_price
                                ? `${Math.round(((product.pricing_price - product.coupon_price_3) / product.pricing_price) * 100)}%`
                                : product.coupon_price_2 && product.pricing_price
                                ? `${Math.round(((product.pricing_price - product.coupon_price_2) / product.pricing_price) * 100)}%`
                                : product.coupon_price_1 && product.pricing_price
                                ? `${Math.round(((product.pricing_price - product.coupon_price_1) / product.pricing_price) * 100)}%`
                                : product.discount_price && product.pricing_price
                                ? `${Math.round(((product.pricing_price - product.discount_price) / product.pricing_price) * 100)}%`
                                : '-'}
                            </div>
                          </DraggableCell>
                          <DraggableCell className="text-center">
                            <div>{product.discount_burden_amount?.toLocaleString() || '-'}</div>
                          </DraggableCell>
                          <DraggableCell className="text-center">
                            <div>{product.adjusted_cost?.toLocaleString() || '-'}</div>
                          </DraggableCell>
                          <DraggableCell className="text-center">
                            <div>{product.expected_commission_fee?.toLocaleString() || '-'}</div>
                            <div className="text-sm text-muted-foreground">
                              {(() => {
                                const pricingPrice = Number(product.pricing_price) || 0;
                                const discountPrice = Number(product.discount_price) || 0;
                                const finalPrice = discountPrice > 0 ? discountPrice : pricingPrice;
                                const discountRatio = pricingPrice > 0 ? (pricingPrice - finalPrice) / pricingPrice : 0;
                                const averageFeeRate = selectedChannelInfo?.average_fee_rate ? parseFloat(String(selectedChannelInfo.average_fee_rate)) : 0;
                                
                                // 스위치 상태에 따라 수수료율 조정
                                let adjustedFeeRate = averageFeeRate;
                                if (isAdjustFeeEnabled && discountRatio > 0) {
                                  const feeRateReduction = Math.floor(discountRatio * 100 / 10);
                                  adjustedFeeRate = Math.max(averageFeeRate - feeRateReduction, 0);
                                }
                                
                                return `${adjustedFeeRate.toFixed(1)}%`;
                              })()}
                            </div>
                          </DraggableCell>
                          <DraggableCell className="text-center">
                            <div>{product.logistics_cost?.toLocaleString() || '-'}</div>
                          </DraggableCell>
                          <DraggableCell className="text-center">
                            <div>{product.expected_net_profit?.toLocaleString() || '-'}</div>
                            <div>
                              {product.expected_net_profit_margin 
                                ? `${(product.expected_net_profit_margin * 100).toFixed(1)}%` 
                                : '-'}
                            </div>
                          </DraggableCell>
                          <DraggableCell className="text-center">
                            <div>{product.expected_settlement_amount?.toLocaleString() || '-'}</div>
                          </DraggableCell>
                          <DraggableCell className="text-center">
                            <div>
                              {(() => {
                                const basePrice = product.adjusted_cost || product.org_price;
                                const finalPrice = product.discount_price || product.pricing_price;
                                const burden = product.discount_burden_amount || 0;
                                
                                if (!basePrice || !finalPrice) return '-';
                                
                                const costRatio = (basePrice / (finalPrice - burden)) * 100;
                                return `${Math.round(costRatio)}%`;
                              })()}
                            </div>
                          </DraggableCell>
                          <DraggableCell className="text-center">
                            <div>{(product.total_stock !== undefined 
                              ? product.total_stock 
                              : product.main_wh_available_stock_excl_production_stock)?.toLocaleString() || '-'}</div>
                            <div className="text-sm text-gray-500 mt-1">{product.soldout_rate ? `${product.soldout_rate}%` : '-'}</div>
                          </DraggableCell>
                          <DraggableCell className="text-center">
                            <div>{product.drop_yn || '-'}</div>
                          </DraggableCell>
                          <DraggableCell className="text-center">
                            <div>{product.supply_name || '-'}</div>
                          </DraggableCell>
                          <DraggableCell className="text-center">
                            <div>{product.exclusive2 || '-'}</div>
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


        {showExcelSettings && (
          <ExcelSettingsModal
            isOpen={showExcelSettings}
            onClose={() => setShowExcelSettings(false)}
            settings={excelSettings}
            onSettingsChange={setExcelSettings}
          />
        )}

        {/* 색상 선택 모달 */}
        <Dialog open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>색상 선택</DialogTitle>
              <DialogDescription>
                선택한 범위의 행에 적용할 색상을 선택하세요.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex flex-wrap gap-2">
                {[
                  { name: '연한 빨강', color: '#FFE4E1' },
                  { name: '연한 보라', color: '#E6E6FA' },
                  { name: '연한 초록', color: '#F0FFF0' },
                  { name: '연한 분홍', color: '#FFF0F5' },
                  { name: '연한 하늘', color: '#F0FFFF' },
                  { name: '연한 주황', color: '#FFE4B5' },
                  { name: '연한 청록', color: '#E0FFFF' },
                  { name: '연한 베이지', color: '#F5F5DC' }
                ].map((colorOption) => (
                  <div
                    key={colorOption.color}
                    className={`w-8 h-8 rounded-full cursor-pointer border-2 ${
                      selectedColor === colorOption.color ? 'border-blue-500' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: colorOption.color }}
                    onClick={() => setSelectedColor(colorOption.color)}
                    title={colorOption.name}
                  />
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleApplyColor}>적용</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DividerModal
          showDividerModal={showDividerModal}
          setShowDividerModal={setShowDividerModal}
          products={products}
          dividerRules={dividerRules}
          onUpdateDividerRule={handleUpdateDividerRule}
          onApplyDivider={handleApplyDivider}
          onResetDividerRules={handleResetDividerRules}
        />
         
        {showCouponDiscountModal && (
          <DiscountModal
            showDiscountModal={showCouponDiscountModal}
            setShowDiscountModal={setShowCouponDiscountModal}
            onApplyDiscount={handleApplyDiscount}
            products={products}
            selectedProducts={selectedProducts}
            onClose={() => setShowCouponDiscountModal(false)}
            calculateExpectedSettlementAmount={calculateExpectedSettlementAmount}
            calculateExpectedNetProfit={calculateExpectedNetProfit}
            calculateExpectedCommissionFee={calculateExpectedCommissionFee}
            selectedChannelInfo={selectedChannelInfo}
            currentProducts={products}
          />
        )}
        <ImmediateDiscountModal
          showDiscountModal={showImmediateDiscountModal}
          setShowDiscountModal={setShowImmediateDiscountModal}
          onApplyDiscount={handleApplyDiscount}
          products={products}
          selectedProducts={selectedProducts}
          onClose={() => setShowImmediateDiscountModal(false)}
          calculateExpectedSettlementAmount={calculateExpectedSettlementAmount}
          calculateExpectedNetProfit={calculateExpectedNetProfit}
          calculateExpectedCommissionFee={calculateExpectedCommissionFee}
          selectedChannelInfo={selectedChannelInfo}
          currentProducts={products}
        />
      </div>
    </>
  )
} 