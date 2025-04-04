'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table"
import { Button } from "@/app/components/ui/button"
import { doc, setDoc, getDoc, getDocs, query, where, collection, limit } from 'firebase/firestore';
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
import { Search, FileDown, Settings, Save, Download, RotateCcw } from "lucide-react"
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
  DragStartEvent,
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
import { Switch } from "@/app/components/ui/switch"
import { Textarea } from "@/app/components/ui/textarea"
import { Product, ChannelInfo, Filters, ExcelSettings, CartItem, DividerRule, ImpactMap, Column } from '@/app/types/cart';
import { 
  calculateLogisticsCost,
  calculateCommissionFee,
  calculateNetProfit,
  calculateProfitMargin,
  calculateSettlementAmount,
  calculateCostRatio,
  calculateExpectedFeeRate,
  calculateAverageDiscountRate,
  calculateAverageCostRatio,
  calculateAverageProfitMargin,
  calculateImmediateDiscountRate,
  calculateCoupon1DiscountRate,
  calculateCoupon2DiscountRate,
  calculateCoupon3DiscountRate,
  calculateFinalDiscountRate,
  calculateDetailedCostRatio,
  calculateBaseCost,
  calculateFinalPrice,
  calculateAdjustedFeeRate,
  calculateChannelPrice
} from '@/app/utils/calculations';
import { ListTopbar } from '@/app/components/list-topbar';
import { parseChannelBasicInfo } from '@/app/utils/calculations/common';
import { useToast } from "@/components/ui/use-toast"
import { Toast } from "@/components/ui/toast"

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
  const { toast } = useToast();
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
  const [isChannelSearchFocused, setIsChannelSearchFocused] = useState(false);
  const [activeId, setActiveId] = useState<string | number | null>(null);
  const [channelSuggestions, setChannelSuggestions] = useState<ChannelInfo[]>([]);
  const [autoSavedCalculations, setAutoSavedCalculations] = useState<{
    products: Product[];
  } | null>(null);
  
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

  // 구분자 규칙 적용 함수
  const applyDividerRules = (products: Product[], rules: DividerRule[]): Product[] => {
    return products.map((product, index) => {
      const rule = rules.find(r => index + 1 >= r.range[0] && index + 1 <= r.range[1]);
      if (rule) {
        return {
          ...product,
          rowColor: rule.color,
          dividerText: rule.text
        };
      }
      return product;
    });
  };
  

  // 상태 변경 기록 함수
  const recordStateChange = useCallback((
    effectType: string,
    productIds: string[],
    description: string,
    effectData: any = {}
  ) => {
    console.log('recordStateChange 호출됨:', {
      effectType,
      productIds,
      description,
      effectData
    });

    // 현재 products 상태의 깊은 복사본 생성
    const currentProducts = JSON.parse(JSON.stringify(products));

    // 이펙트맵에 따른 연관 데이터 업데이트
    const affectedFields = ['pricing_price', 'total_price', 'logistics_cost', 'channel_name', 'channel_category'];
    if (affectedFields.length > 0) {
      affectedFields.forEach((field: string) => {
        currentProducts.forEach((product: Product) => {
          if (productIds.includes(product.product_id)) {
            // 필드에 따른 데이터 업데이트
            switch (field) {
              case 'pricing_price':
                if (selectedChannelInfo) {
                  product.pricing_price = calculateChannelPrice(product, selectedChannelInfo);
                }
                break;
              case 'total_price':
                product.total_price = calculateFinalPrice(product);
                break;
              case 'logistics_cost':
                if (selectedChannelInfo) {
                  const logisticsCost = calculateLogisticsCost(selectedChannelInfo, deliveryType || 'conditional', Number(selectedChannelInfo.amazon_shipping_cost));
                  product.logistics_cost = logisticsCost;
                }
                break;
              case 'channel_name':
                if (selectedChannelInfo) {
                  product.channel_name = selectedChannelInfo.channel_name_2;
                }
                break;
              case 'channel_category':
                if (selectedChannelInfo) {
                  product.channel_category = selectedChannelInfo.channel_category_2;
                }
                break;
            }
          }
        });
      });
    }

    console.log('recordStateChange 완료:', {
      updatedProducts: currentProducts,
      affectedFields
    });
  }, [products, selectedChannelInfo, deliveryType]);

  /**
   * 할인 적용 처리
   * @param updatedProducts 할인 적용할 상품 목록
   */
  const handleApplyDiscount = useCallback((products: Product[]) => {
    console.log('handleApplyDiscount 호출됨:', {
      products
    });

    // 상품 목록 업데이트
    setProducts(products);

    console.log('handleApplyDiscount 완료');
  }, [setProducts]);

  // 탭별 상태 업데이트 핸들러
  const handleTabStateUpdate = useCallback((tab: string, updates: Partial<typeof tabStates.tab1>) => {
    setTabStates(prev => ({
      ...prev,
      [tab]: {
        ...prev[tab],
        ...updates
      }
    }));
  }, []);

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

  // 채널 검색 입력 핸들러 수정
  const handleChannelSearch = async () => {
    console.log('handleChannelSearch 시작');
    try {
      if (channelSearchTerm.trim() === '') {
        setChannelSuggestions([]);
        setFilteredChannels([]);
        setShowChannelSuggestions(false);
        setIsValidChannel(true);
        return;
      }

      // 로컬 검색 수행
      const filtered = channels.filter(channel => 
        channel.channel_name_2.toLowerCase().includes(channelSearchTerm.toLowerCase())
      );
      
      if (filtered.length > 0) {
        setChannelSuggestions(filtered);
        setFilteredChannels(filtered);
        setShowChannelSuggestions(true);
        setIsValidChannel(filtered.some(channel => 
          channel.channel_name_2.toLowerCase() === channelSearchTerm.toLowerCase()
        ));
        return;
      }

      // 로컬에서 결과를 찾지 못한 경우에만 Firebase 검색
      const q = query(
        collection(db, 'channels'),
        where('channel_name_2', '>=', channelSearchTerm),
        where('channel_name_2', '<=', channelSearchTerm + '\uf8ff'),
        limit(5)
      );

      const querySnapshot = await getDocs(q);
      const suggestions: ChannelInfo[] = [];
      querySnapshot.forEach((doc) => {
        suggestions.push(doc.data() as ChannelInfo);
      });

      setChannelSuggestions(suggestions);
      setFilteredChannels(suggestions);
      setShowChannelSuggestions(suggestions.length > 0);
      setIsValidChannel(suggestions.some(channel => 
        channel.channel_name_2.toLowerCase() === channelSearchTerm.toLowerCase()
      ));
    } catch (error) {
      console.error('채널 검색 오류:', error);
      setChannelSuggestions([]);
      setFilteredChannels([]);
      setShowChannelSuggestions(false);
      setIsValidChannel(false);
    }
    console.log('handleChannelSearch 종료');
  };

  // 채널 검색어 변경 시 디바운스 적용
  useEffect(() => {
    const timer = setTimeout(() => {
      if (channelSearchTerm.trim()) {
        handleChannelSearch();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [channelSearchTerm]);

  // 검색 완료 처리
  const handleChannelSearchComplete = () => {
    console.log('handleChannelSearchComplete 시작');
    setIsChannelSearchFocused(false);
    setShowChannelSuggestions(false);
    console.log('handleChannelSearchComplete 종료');
  };
      
  // handleChannelSelect 함수 수정
  const handleChannelSelect = async (channelInfo: ChannelInfo | null) => {
    console.log('[handleChannelSelect] START', JSON.stringify(channelInfo, null, 2));
    if (!channelInfo) {
      console.log('[handleChannelSelect] 채널 정보가 없습니다. 계산 중단');
      return;
    }

    // 필요한 채널 정보 확인
    const { exchangeRate, markupRatio, rounddown } = parseChannelBasicInfo(channelInfo);
    console.log('[handleChannelSelect] 파싱된 채널 정보:', { exchangeRate, markupRatio, rounddown });
    
    if (!exchangeRate || !markupRatio || !rounddown) {
      console.log('[handleChannelSelect] 필수 채널 정보 누락:', {
        exchangeRate: exchangeRate || '누락',
        markupRatio: markupRatio || '누락',
        rounddown: rounddown || '누락'
      });
    }

    // 제품 가격 계산 및 업데이트
    const updatedProducts = products.map(product => {
      console.log(`[상품 처리] ID: ${product.product_id}, 이름: ${product.name}`);
      
      // shop_price 및 global_price 체크
      let updatedProduct = { ...product };
      let priceError = false;
      
      if (channelInfo.type === '일본' || channelInfo.type === '자사몰') {
        if (!product.shop_price) {
          console.log(`[오류] 상품 ID: ${product.product_id}의 shop_price가 없습니다.`);
          priceError = true;
        }
      } else if (channelInfo.type === '국내' || channelInfo.type === '해외') {
        if (!product.global_price) {
          console.log(`[오류] 상품 ID: ${product.product_id}의 global_price가 없습니다.`);
          priceError = true;
        }
      }
      
      // 가격 계산
      const pricing_price = calculateChannelPrice(product, channelInfo);
      console.log(`[가격 계산] 상품 ID: ${product.product_id}, 계산된 pricing_price: ${pricing_price}`);
      
      // 물류비 계산 - deliveryType 변수 사용
      const logistics_cost = calculateLogisticsCost(channelInfo, deliveryType || 'conditional', Number(channelInfo.amazon_shipping_cost));
      console.log(`[물류비 계산] 상품 ID: ${product.product_id}, 계산된 logistics_cost: ${logistics_cost}`);

      // 조정원가 계산
      const adjusted_cost = calculateBaseCost(product, channelInfo);
      console.log(`[조정원가 계산] 상품 ID: ${product.product_id}, 계산된 adjusted_cost: ${adjusted_cost}`);

      // 수수료 계산
      const expected_commission_fee = calculateCommissionFee(product, channelInfo, isAdjustFeeEnabled);
      const expected_commission_fee_rate = calculateAdjustedFeeRate(product, channelInfo, isAdjustFeeEnabled);
      
      // 순이익 계산
      const expected_net_profit = calculateNetProfit(product, channelInfo);
      const expected_net_profit_margin = calculateProfitMargin(product, channelInfo);
      
      // 정산금액 계산
      const expected_settlement_amount = calculateSettlementAmount(product);
      
      // 원가율 계산
      const cost_ratio = calculateCostRatio(product, channelInfo);

      console.log(`[상세 계산] 상품 ID: ${product.product_id}`, {
        pricing_price,
        adjusted_cost,
        logistics_cost,
        expected_commission_fee,
        expected_commission_fee_rate: `${expected_commission_fee_rate}%`,
        expected_net_profit,
        expected_net_profit_margin: `${expected_net_profit_margin * 100}%`,
        expected_settlement_amount,
        cost_ratio: `${cost_ratio}%`
      });
      
      return {
        ...updatedProduct,
        pricing_price,
        adjusted_cost,
        logistics_cost,
        expected_commission_fee,
        expected_commission_fee_rate,
        expected_net_profit,
        expected_net_profit_margin,
        expected_settlement_amount,
        cost_ratio,
        ...(priceError ? { priceError: true } : {})
      };
    });
    
    console.log('[handleChannelSelect] 상태 업데이트 시작');
    setChannelSearchTerm(channelInfo.channel_name_2);
    setIsValidChannel(true);
    setFilters(prev => ({
      ...prev,
      channel_name_2: channelInfo.channel_name_2
    }));
    setProducts(updatedProducts);
    setSelectedChannelInfo(channelInfo);
    setShowChannelSuggestions(false);
    console.log('[handleChannelSelect] 상태 업데이트 완료');

    // 계산이 완료된 후 현재 상태 자동 저장
    console.log('[handleChannelSelect] 계산 완료 후 상태 자동 저장 시작');
    const savedState = {
      products: updatedProducts.map(p => ({
        ...p,
        // 기본 정보
        product_id: p.product_id,
        name: p.name,
        brand: p.brand,
        category_1: p.category_1,
        category_3: p.category_3,
        extra_column2: p.extra_column2,
        img_desc1: p.img_desc1,
        product_desc: p.product_desc,
        
        // 가격 정보
        org_price: p.org_price,
        shop_price: p.shop_price,
        global_price: p.global_price,
        pricing_price: p.pricing_price,
        
        // 할인 정보
        discount_price: p.discount_price,
        discount_rate: p.discount_rate,
        discount_unit: p.discount_unit,
        coupon_price_1: p.coupon_price_1,
        coupon_price_2: p.coupon_price_2,
        coupon_price_3: p.coupon_price_3,
        discount_burden_amount: p.discount_burden_amount,
        discount: p.discount,
        
        // 원가 및 수수료 정보
        adjusted_cost: p.adjusted_cost,
        logistics_cost: p.logistics_cost,
        expected_commission_fee: p.expected_commission_fee,
        expected_commission_fee_rate: p.expected_commission_fee_rate,
        
        // 이익 정보
        expected_net_profit: p.expected_net_profit,
        expected_net_profit_margin: p.expected_net_profit_margin,
        expected_settlement_amount: p.expected_settlement_amount,
        cost_ratio: p.cost_ratio,
        
        // 재고 정보
        total_stock: p.total_stock,
        main_wh_available_stock_excl_production_stock: p.main_wh_available_stock_excl_production_stock,
        soldout_rate: p.soldout_rate,
        
        // 기타 정보
        drop_yn: p.drop_yn,
        supply_name: p.supply_name,
        exclusive2: p.exclusive2,
        rowColor: p.rowColor,
        dividerText: p.dividerText
      }))
    };
    setAutoSavedCalculations(savedState);
    console.log('[handleChannelSelect] 자동 저장된 상태:', JSON.stringify(savedState, null, 2));
    
    console.log('[handleChannelSelect] 장바구니 정보 저장 시작');
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

  // 상품 삭제 핸들러
  const handleRemoveProduct = (productId: string) => {
    const updatedProducts = products.filter(p => p.product_id !== productId);
    setProducts(updatedProducts);
    
    // 되돌리기 기능에 기록
    recordStateChange('PRODUCT_REMOVE', [productId], '상품 삭제');
  };

  // 선택된 상품 삭제 핸들러
  const handleRemoveSelectedProducts = () => {
    if (selectedProducts.length === 0) return;
    
    const updatedProducts = products.filter(p => !selectedProducts.includes(p.product_id));
    setProducts(updatedProducts);
    setSelectedProducts([]);
    
    // 되돌리기 기능에 기록
    recordStateChange('PRODUCT_REMOVE', selectedProducts, '선택된 상품 삭제');
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
        // 할인 관련 필드 초기화
        newProduct.discount_price = null as any;
        newProduct.discount = null as any;
        newProduct.discount_rate = null as any;
        newProduct.discount_unit = null as any;
        newProduct.coupon_price_1 = null as any;
        newProduct.coupon_price_2 = null as any;
        newProduct.coupon_price_3 = null as any;
        newProduct.self_ratio = null as any;
        newProduct.discount_burden_amount = null as any;
        
        // 수수료 및 정산 관련 필드 초기화
        newProduct.expected_commission_fee = null as any;
        newProduct.expected_net_profit = null as any;
        newProduct.expected_net_profit_margin = null as any;
        newProduct.expected_settlement_amount = null as any;
        
        // 원가 관련 필드 초기화
        newProduct.adjusted_cost = null as any;
        newProduct.logistics_cost = null as any;
        
        return newProduct;
      });

      setProducts(updatedProducts);
      
      // 채널 상태 초기화
      setChannelSearchTerm('');
      setSelectedChannelInfo(null);
      setFilters(prev => ({
        ...prev,
        channel_name_2: ''
      }));
      
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
    
    // 되돌리기 기능에 기록
    recordStateChange(
      'COLOR_CHANGE',
      updatedProducts.filter(p => p.rowColor === selectedColor).map(p => p.product_id),
      '색상 적용'
    );
    
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

  // 구분자 적용 핸들러
  const handleApplyDivider = (dividerRules: DividerRule[]) => {
    const updatedProducts = applyDividerRules(products, dividerRules);
    setProducts(updatedProducts);
    recordStateChange(
      'DIVIDER_CHANGE',
      updatedProducts.map(p => p.product_id),
      '구분자 적용',
      { dividerRules }
    );
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

  // 스위치 상태 변경 핸들러
  const handleAdjustFeeChange = async (checked: boolean) => {
    setIsAdjustFeeEnabled(checked);
    if (selectedChannelInfo) {
      const updatedProducts = products.map(product => ({
        ...product,
        expected_commission_fee: calculateCommissionFee(product, selectedChannelInfo, checked)
      }));
      setProducts(updatedProducts);
      await saveCartInfo();
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const handleChannelSearchFocus = () => {
    setIsChannelSearchFocused(true);
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = products.findIndex(p => p.product_id === active.id);
      const newIndex = products.findIndex(p => p.product_id === over.id);
      
      const updatedProducts = arrayMove(products, oldIndex, newIndex);
      setProducts(updatedProducts);
      
      // 되돌리기 기능에 기록
      recordStateChange('PRODUCT_REORDER', [active.id as string, over.id as string], '상품 순서 변경');
    }
  };

  // 상품 목록이 변경될 때마다 실행
  useEffect(() => {
    if (products.length > 0) {
      console.log('상품 목록 변경 감지:', {
        productsLength: products.length,
        hasDiscountPrice: products.some(p => p.discount_price)
      });
    }
  }, [products]);

  // handleRevertCalculations 함수 수정
  const handleRevertCalculations = () => {
    console.log('[handleRevertCalculations] START');
    
    if (!autoSavedCalculations) {
      console.log('[handleRevertCalculations] 저장된 계산 데이터가 없음');
      toast({
        description: "저장된 계산 데이터가 없습니다.",
        variant: "destructive"
      });
      return;
    }

    const checkedProducts = products.filter(p => selectedProducts.includes(p.product_id));
    console.log(`[handleRevertCalculations] 체크된 상품 수: ${checkedProducts.length}`);
    
    if (checkedProducts.length === 0) {
      console.log('[handleRevertCalculations] 선택된 상품이 없음');
      toast({
        description: "선택된 상품이 없습니다.",
        variant: "destructive"
      });
      return;
    }

    console.log('[handleRevertCalculations] 되돌리기 시작');
    
    // 체크된 상품만 이전 계산 데이터로 되돌리기
    const revertedProducts = products.map(product => {
      if (!selectedProducts.includes(product.product_id)) return product;
      
      const savedProduct = autoSavedCalculations.products.find(
        p => p.product_id === product.product_id
      );
      
      if (savedProduct) {
        console.log(`[handleRevertCalculations] 상품 되돌리기 - ID: ${product.product_id}`, {
          이전_상태: {
            pricing_price: product.pricing_price,
            discount_price: product.discount_price,
            discount_rate: product.discount_rate,
            discount_unit: product.discount_unit,
            coupon_price_1: product.coupon_price_1,
            coupon_price_2: product.coupon_price_2,
            coupon_price_3: product.coupon_price_3,
            discount_burden_amount: product.discount_burden_amount,
            adjusted_cost: product.adjusted_cost,
            logistics_cost: product.logistics_cost,
            expected_commission_fee: product.expected_commission_fee,
            expected_commission_fee_rate: product.expected_commission_fee_rate,
            expected_net_profit: product.expected_net_profit,
            expected_net_profit_margin: product.expected_net_profit_margin,
            expected_settlement_amount: product.expected_settlement_amount,
            cost_ratio: product.cost_ratio,
            discount: product.discount
          },
          새로운_상태: {
            pricing_price: savedProduct.pricing_price,
            discount_price: savedProduct.discount_price,
            discount_rate: savedProduct.discount_rate,
            discount_unit: savedProduct.discount_unit,
            coupon_price_1: savedProduct.coupon_price_1,
            coupon_price_2: savedProduct.coupon_price_2,
            coupon_price_3: savedProduct.coupon_price_3,
            discount_burden_amount: savedProduct.discount_burden_amount,
            adjusted_cost: savedProduct.adjusted_cost,
            logistics_cost: savedProduct.logistics_cost,
            expected_commission_fee: savedProduct.expected_commission_fee,
            expected_commission_fee_rate: savedProduct.expected_commission_fee_rate,
            expected_net_profit: savedProduct.expected_net_profit,
            expected_net_profit_margin: savedProduct.expected_net_profit_margin,
            expected_settlement_amount: savedProduct.expected_settlement_amount,
            cost_ratio: savedProduct.cost_ratio,
            discount: savedProduct.discount
          }
        });
        
        // 저장된 상태로 완전히 복원
        return {
          ...product,
          // 가격 정보
          pricing_price: savedProduct.pricing_price,
          
          // 할인 정보
          discount_price: savedProduct.discount_price,
          discount_rate: savedProduct.discount_rate,
          discount_unit: savedProduct.discount_unit,
          coupon_price_1: savedProduct.coupon_price_1,
          coupon_price_2: savedProduct.coupon_price_2,
          coupon_price_3: savedProduct.coupon_price_3,
          discount_burden_amount: savedProduct.discount_burden_amount,
          discount: savedProduct.discount,
          
          // 원가 및 수수료 정보
          adjusted_cost: savedProduct.adjusted_cost,
          logistics_cost: savedProduct.logistics_cost,
          expected_commission_fee: savedProduct.expected_commission_fee,
          expected_commission_fee_rate: savedProduct.expected_commission_fee_rate,
          
          // 이익 정보
          expected_net_profit: savedProduct.expected_net_profit,
          expected_net_profit_margin: savedProduct.expected_net_profit_margin,
          expected_settlement_amount: savedProduct.expected_settlement_amount,
          cost_ratio: savedProduct.cost_ratio
        };
      }
      
      return product;
    });

    console.log('[handleRevertCalculations] 상태 업데이트');
    setProducts(revertedProducts);
    
    console.log('[handleRevertCalculations] 토스트 메시지 표시');
    toast({
      description: `${checkedProducts.length}개 상품의 계산 데이터를 되돌렸습니다.`
    });
    
    console.log('[handleRevertCalculations] END');
  };

  return (
    <>
      <Toast />
      <ListTopbar/>
        <div className="container mx-auto py-5">
            <div className="flex justify-between items-center mb-6">
                <div className="flex flex-col">
                    <h1 className="text-2xl font-bold">리스트 편집</h1>
                </div>
            </div>
        
        {/* 편집 섹션 */}
        <Card className="mb-6 py-5 px-5 bg-card rounded-lg shadow-sm">
          <CardContent className="p-0">
            <div className="flex flex-col gap-6">
              <div className="text-sm text-gray-500">
                <span className="mr-4">UUID : {listUuid}</span>
                <span className="mr-4">작성자 : {user?.uid === 'a8mwwycqhaZLIb9iOcshPbpAVrj2' ? '한재훈' :
                 user?.uid === 'MhMI2KxbxkPHIAJP0o4sPSZG35e2' ? '이세명' :
                 user?.uid === '6DnflkbFSifLCNVQGWGv7aqJ2w72' ? '박연수' : ''}</span>
                {selectedChannelInfo?.average_fee_rate && (<span className="mr-4 rounded-md shadow-sm bg-muted px-2 py-1">평균수수료 : {selectedChannelInfo.average_fee_rate}</span>)}
                {products.length > 0 && (
                  <>
                    <span className="mr-4 rounded-md shadow-sm bg-muted px-2 py-1">
                      평균할인율 : {calculateAverageDiscountRate(products)}%
                    </span>
                    <span className="mr-4 rounded-md shadow-sm bg-muted px-2 py-1">
                      평균원가율 : {calculateAverageCostRatio(products)}%
                    </span>
                    <span className="mr-4 rounded-md shadow-sm bg-muted px-2 py-1">
                      평균순이익률 : {selectedChannelInfo ? calculateAverageProfitMargin(products, selectedChannelInfo) : 0}%
                    </span>
                  </>
                )}
                <span>{dividerRules.map((rule, index) => (
                      rule.range[0] > 0 && rule.range[1] > 0 && (
                        <span 
                          key={rule.id} 
                          className="items-center gap-2 px-2  py-1 rounded-md shadow-sm bg-muted text-sm mr-4"
                          style={{ backgroundColor: rule.color || '#FFE4E1' }}
                        >
                          <span className="mr-2">{rule.range[0]}~{rule.range[1]}</span>
                          {rule.text && <span className="text-muted-foreground">{rule.text}</span>}
                        </span>
                      )
                    ))}
                </span>
              </div>

                <div className="flex items-center gap-4 ">
                  <input
                    type="text"
                    value={title}
                    onChange={handleTitleChange}
                    placeholder="타이틀을 입력해주세요"
                    className={`w-[300px] h-8 px-3 border-[0px] border-b-[1px] focus:border-b-[0px] focus:outline-none focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 text-sm ${
                      title ? 'border-blue-500 focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 bg-muted' : 'border-input bg-background'
                    }`}
                  />
                  <div className="relative">
                    <input
                      type="text"
                      value={channelSearchTerm}
                      onChange={(e) => {
                        setChannelSearchTerm(e.target.value);
                        // 입력이 비어있으면 제안 목록 숨기기
                        if (!e.target.value.trim()) {
                          setFilteredChannels([]);
                          setShowChannelSuggestions(false);
                        } else {
                          // 입력이 있으면 필터링하여 제안 목록 표시
                          const filtered = channels.filter(channel => 
                            channel.channel_name_2.toLowerCase().includes(e.target.value.toLowerCase())
                          );
                          setFilteredChannels(filtered);
                          setShowChannelSuggestions(filtered.length > 0);
                        }
                      }}
                      onFocus={handleChannelSearchFocus}
                      placeholder="채널명을 입력해주세요"
                      className={`w-[160px] h-8 px-3 border-[0px] border-b-[1px] focus:border-b-[0px] focus:outline-none focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 text-sm ${
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
                  <div className="flex items-center">
                  <Label className="text-sm text-muted-foreground">수수료 할인</Label>
                    <Switch
                      checked={isAdjustFeeEnabled}
                      onCheckedChange={handleAdjustFeeChange}
                      className="ml-2"
                    />
                  </div>

                  <Select 
                    value={deliveryType} 
                    onValueChange={handleDeliveryTypeChange}
                  >
                    <SelectTrigger className={`w-[120px] h-8 ${
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
                    <div className="text-sm text-muted-foreground">기간</div>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => handleDateChange(e, 'start')}
                      className={`w-[150px] h-8 px-3 border-[1px] rounded-md shadow-sm focus:outline-none focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 text-sm ${
                        startDate ? 'border-blue-500 focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 bg-muted' : 'border-input bg-background'
                      }`}
                    />
                    <span className="text-muted-foreground">~</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => handleDateChange(e, 'end')}
                      className={`w-[150px] h-8 px-3 border-[1px] rounded-md shadow-sm focus:outline-none focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 text-sm ${
                        endDate ? 'border-blue-500 focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 bg-muted' : 'border-input bg-background'
                      }`}
                    />
                  </div>
                </div>

                {/* 메모 입력창 수정 */}
                <div className="w-full flex gap-4">
                  <div className="relative w-full">
                    <textarea
                      value={memo1}
                      onChange={handleMemo1Change}
                      placeholder="메모 1"
                      className={`w-full h-8 px-3 border-[0px] border-b-[1px] focus:border-b-[0px] focus:outline-none focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 text-sm ${
                        memo1 ? 'border-blue-500 focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 bg-muted' : 'border-input bg-background'
                      }`}
                      style={{ resize: 'both' }}
                    />
                  </div>
                  <div className="relative w-full">
                    <textarea
                      value={memo2}
                      onChange={handleMemo2Change}
                      placeholder="메모 2"
                      className={`w-full h-8 px-3 border-[0px] border-b-[1px] focus:border-b-[0px] focus:outline-none focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 text-sm ${
                        memo2 ? 'border-blue-500 focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 bg-muted' : 'border-input bg-background'
                      }`}
                      style={{ resize: 'both' }}
                    />
                  </div>
                  <div className="relative w-full">
                    <textarea
                      value={memo3}
                      onChange={handleMemo3Change}
                      placeholder="메모 3"
                      className={`w-full h-8 px-3 border-[0px] border-b-[1px] focus:border-b-[0px] focus:outline-none focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 text-sm ${
                        memo3 ? 'border-blue-500 focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 bg-muted' : 'border-input bg-background'
                      }`}
                      style={{ resize: 'both' }}
                    />
                  </div>
                  
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="mb-6 py-5 px-5 bg-card rounded-lg shadow-sm">
            {/* 할인 적용 섹션 */}
            <div className="flex justify-between items-center mb-2">
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
                  onClick={handleRevertCalculations}
                  disabled={!autoSavedCalculations || !products.some(p => selectedProducts.includes(p.product_id))}
                  className="border-0 hover:bg-transparent hover:text-primary flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  선택 초기화
                </Button>
                {/*<Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetDiscount}
                  className="border-0 hover:bg-transparent hover:text-primary"
                >
                  할인 초기화
                </Button>*/}
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

          {/* 상품 테이블 */}
            <div className="rounded-md border overflow-hidden">
              <div className="w-full">
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
                              <TableHead className="text-center w-[90px]">할인부담액</TableHead>
                              <TableHead className="text-center w-[80px]">조정원가</TableHead>
                              <TableHead className="text-center w-[80px]">예상수수료</TableHead>
                              <TableHead className="text-center w-[80px]">물류비</TableHead>
                              <TableHead className="text-center w-[100px]">예상순이익액</TableHead>
                              <TableHead className="text-center w-[100px]">정산예정금액</TableHead>
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
                                <DraggableCell className="text-center">{/* 번호 */}
                                  <div>{index + 1}</div>
                                </DraggableCell>
                                <DraggableCell className="text-center">{/* 이지어드민상품코드 */}
                                  <div>{product.product_id}</div>
                                </DraggableCell>
                                <DraggableCell className="text-center">{/* 이미지 */}
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
                                <TableCell className="text-left">{/* 상품명 */}
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
                                <DraggableCell className="text-center">{/* 판매가 */}
                                  <div>{product.pricing_price?.toLocaleString() || '-'}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {selectedChannelInfo && product.org_price 
                                      ? calculateBaseCost(product, selectedChannelInfo).toLocaleString()
                                      : '-'}
                                  </div>
                                </DraggableCell>
                                <DraggableCell className="text-center">{/* 즉시할인 */}
                                  <div>{product.discount_price?.toLocaleString() || '-'}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {product.discount_price && product.pricing_price 
                                      ? `${calculateImmediateDiscountRate(product)}%`
                                      : '-'}
                                  </div>
                                </DraggableCell>
                                <DraggableCell className="text-center">{/* 쿠폰1 */}
                                  <div>{product.coupon_price_1 ? product.coupon_price_1.toLocaleString() : "-"}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {product.coupon_price_1 && product.discount_price
                                      ? `${calculateCoupon1DiscountRate(product)}%`
                                      : '-'}
                                  </div>
                                </DraggableCell>
                                <DraggableCell className="text-center">{/* 쿠폰2 */}
                                  <div>{product.coupon_price_2 ? product.coupon_price_2.toLocaleString() : "-"}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {product.coupon_price_2 && product.coupon_price_1
                                      ? `${calculateCoupon2DiscountRate(product)}%`
                                      : '-'}
                                  </div>
                                </DraggableCell>
                                <DraggableCell className="text-center">{/* 쿠폰3 */}
                                  <div>{product.coupon_price_3 ? product.coupon_price_3.toLocaleString() : "-"}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {product.coupon_price_3 && product.coupon_price_2
                                      ? `${calculateCoupon3DiscountRate(product)}%`
                                      : '-'}
                                  </div>
                                </DraggableCell>
                                <DraggableCell className="text-center">{/* 최종할인 */}
                                  <div> 
                                    {product.coupon_price_3 ? product.coupon_price_3.toLocaleString() :
                                    product.coupon_price_2 ? product.coupon_price_2.toLocaleString() :
                                    product.coupon_price_1 ? product.coupon_price_1.toLocaleString() :
                                    product.discount_price?.toLocaleString() || '-'}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {product.pricing_price ? `${calculateFinalDiscountRate(product)}%` : '-'}
                                  </div>
                                </DraggableCell>
                                <DraggableCell className="text-center">{/* 할인부담액 */}
                                  <div>{product.discount_burden_amount?.toLocaleString() || '-'}</div>
                                </DraggableCell>
                                <DraggableCell className="text-center">{/* 조정원가 */}
                                  <div>{product.adjusted_cost?.toLocaleString() || '-'}</div>
                                </DraggableCell>
                                <DraggableCell className="text-center">{/* 예상수수료 */}
                                  <div>{selectedChannelInfo 
                                    ? calculateCommissionFee(product, selectedChannelInfo, isAdjustFeeEnabled).toLocaleString() 
                                    : '-'}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {selectedChannelInfo 
                                      ? `${calculateAdjustedFeeRate(product, selectedChannelInfo, isAdjustFeeEnabled).toFixed(1)}%` 
                                      : '-'}
                                  </div>
                                </DraggableCell>
                                <DraggableCell className="text-center">{/* 물류비 */}
                                  <div>
                                    {selectedChannelInfo 
                                      ? calculateLogisticsCost(selectedChannelInfo, deliveryType, Number(selectedChannelInfo.amazon_shipping_cost)).toLocaleString() 
                                      : '-'}
                                  </div>
                                </DraggableCell>
                                <DraggableCell className="text-center">{/* 예상순이익 */}
                                  <div>
                                    {selectedChannelInfo 
                                      ? `${calculateNetProfit(product, selectedChannelInfo).toLocaleString()}`
                                      : '-'}
                                  </div>
                                  <div className="text-sm text-gray-500 mt-1">
                                    {selectedChannelInfo && product.pricing_price
                                      ? `${(calculateProfitMargin(product, selectedChannelInfo) * 100).toFixed(2)}%`
                                      : '-'}
                                  </div>
                                </DraggableCell>
                                <DraggableCell className="text-center">{/* 예상정산액 */}
                                  <div>{calculateSettlementAmount(product).toLocaleString() || '-'}</div>
                                </DraggableCell>
                                <DraggableCell className="text-center">{/* 원가율 */}
                                  <div>
                                    {selectedChannelInfo && product.org_price 
                                      ? `${calculateCostRatio(product, selectedChannelInfo)}%`
                                      : '-'}
                                  </div>
                                </DraggableCell>
                                <DraggableCell className="text-center">{/* 재고 */}
                                  <div>
                                    {product.total_stock !== undefined 
                                      ? product.total_stock.toLocaleString() 
                                      : product.main_wh_available_stock_excl_production_stock?.toLocaleString() || '-'}
                                  </div>
                                  <div className="text-sm text-gray-500 mt-1">
                                    {product.soldout_rate ? `${product.soldout_rate}%` : '-'}
                                  </div>
                                </DraggableCell>
                                <DraggableCell className="text-center">{/* 드랍여부 */}
                                  <div>{product.drop_yn || '-'}</div>
                                </DraggableCell>
                                <DraggableCell className="text-center">{/* 공급처명 */}
                                  <div>{product.supply_name || '-'}</div>
                                </DraggableCell>
                                <DraggableCell className="text-center">{/* 단독여부 */}  
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
                  선택한 범위의 행에 적용할 색상을 선택해주세요.
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
              calculateExpectedSettlementAmount={calculateSettlementAmount}
              calculateExpectedNetProfit={(product) => selectedChannelInfo ? calculateNetProfit(product, selectedChannelInfo) : 0}
              calculateExpectedCommissionFee={(product, checked) => selectedChannelInfo ? calculateCommissionFee(product, selectedChannelInfo, !!checked) : 0}
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
            calculateExpectedSettlementAmount={calculateSettlementAmount}
            calculateExpectedNetProfit={(product) => selectedChannelInfo ? calculateNetProfit(product, selectedChannelInfo) : 0}
            calculateExpectedCommissionFee={(product, checked) => selectedChannelInfo ? calculateCommissionFee(product, selectedChannelInfo, !!checked) : 0}
            selectedChannelInfo={selectedChannelInfo}
            currentProducts={products}
          />
        </div>
      </>
    );
  }
