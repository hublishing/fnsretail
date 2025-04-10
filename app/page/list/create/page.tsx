'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { doc, setDoc, getDoc, getDocs, query, where, collection, limit } from 'firebase/firestore';
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
import { Search, FileDown, Settings, Save, Download, RotateCcw, Calendar } from "lucide-react"
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
import { DiscountModal } from "@/components/coupon-discount-modal"
import { ImmediateDiscountModal } from "@/components/immediate-discount-modal"
import { calculateDiscount } from "@/app/utils/calculations/discount"
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
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { DividerModal } from '@/components/divider-modal';
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
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
  calculateChannelPrice,
  calculateAdjustedCost
} from '@/app/utils/calculations'; 
import { parseChannelBasicInfo } from '@/app/utils/calculations/common';
import { useToast } from "@/components/ui/use-toast"
import { Toast } from "@/components/ui/toast"
import { ToastProvider } from "@/components/ui/toaster"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { DateRange } from 'react-day-picker'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from "@/lib/utils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import { CheckCircle2 } from "lucide-react"
import { CircleAlert  } from "lucide-react"
import { auth } from '@/lib/firebase';
import { useAutoSave } from '@/hooks/useAutoSave';

type CouponDiscount = {
  product_id: string;
  discountType: string;
  discountValue: number;
  unitType: string;
  appliedProducts: string[];
  updatedAt: string;
};

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
      if (index === 0 || index === 5) {
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

interface AutoSaveData {
  title: string;
  channel_name_2: string;
  delivery_type: string;
  start_date: string;
  end_date: string;
  memo1: string;
  memo2: string;
  memo3: string;
  fee_discount: boolean;
  productIds: string[];
  selectedChannelInfo: ChannelInfo | null;
  immediateDiscount?: {
    discountType: string;
    discountValue: number;
    unitType: string;
    appliedProducts: string[];
    updatedAt: string;
  };
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
  const [selectedChannel, setSelectedChannel] = useState<string>('');
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
  const [showAdjustCostModal, setShowAdjustCostModal] = useState(false);
  const [adjustCostValue, setAdjustCostValue] = useState<string>('');
  const [isFeeDiscountEnabled, setIsFeeDiscountEnabled] = useState(false);
  
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
  

  interface User {
    uid: string;
    email?: string;
  }
  
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
    console.log('=== handleApplyDiscount 시작 ===');
    console.log('입력된 상품 목록:', JSON.stringify(products, null, 2));

    // undefined 값이 있는지 확인
    const hasUndefined = products.some(product => {
      return Object.entries(product).some(([key, value]) => {
        if (value === undefined) {
          console.error(`상품 ${product.product_id}의 ${key} 필드에 undefined 값 발견`);
          return true;
        }
        if (typeof value === 'object' && value !== null) {
          const hasNestedUndefined = Object.entries(value).some(([nestedKey, nestedValue]) => {
            if (nestedValue === undefined) {
              console.error(`상품 ${product.product_id}의 ${key}.${nestedKey} 필드에 undefined 값 발견`);
              return true;
            }
            return false;
          });
          if (hasNestedUndefined) return true;
        }
        return false;
      });
    });

    if (hasUndefined) {
      console.error('undefined 값이 포함된 상품 데이터가 있습니다.');
      return;
    }

    // 상품 목록 업데이트
    setProducts(products);

    console.log('=== handleApplyDiscount 완료 ===');
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
          console.log('파이어베이스에서 가져온 데이터:', data);
          
          if (data && typeof data === 'object') {
            // 1. 채널 정보 먼저 복원
            if (data.selectedChannelInfo) {
              console.log('채널 정보 복원:', data.selectedChannelInfo);
              setSelectedChannelInfo(data.selectedChannelInfo);
            }
            
            if (typeof data.channel_name_2 === 'string') {
              console.log('채널명 복원:', data.channel_name_2);
              setSelectedChannel(data.channel_name_2);
              setChannelSearchTerm(data.channel_name_2);
              setFilters(prev => ({ ...prev, channel_name_2: data.channel_name_2 }));
            }

            // 2. 기본 입력값 복원
            if (typeof data.title === 'string') setTitle(data.title);
            if (typeof data.delivery_type === 'string') {
              setDeliveryType(data.delivery_type);
              setFilters(prev => ({ ...prev, delivery_type: data.delivery_type }));
            }
            if (typeof data.start_date === 'string') setStartDate(data.start_date);
            if (typeof data.end_date === 'string') setEndDate(data.end_date);
            if (typeof data.memo1 === 'string') setMemo1(data.memo1);
            if (typeof data.memo2 === 'string') setMemo2(data.memo2);
            if (typeof data.memo3 === 'string') setMemo3(data.memo3);
            if (typeof data.fee_discount === 'boolean') setIsFeeDiscountEnabled(data.fee_discount);

            // 3. 상품 데이터 복원
            if (Array.isArray(data.products) && data.products.length > 0) {
              console.log('상품 데이터 직접 설정:', data.products.length);
              setProducts(data.products);

              // 4. 즉시할인 정보가 있는 경우 적용
              if (data.immediateDiscount) {
                console.log('즉시할인 정보 복원:', data.immediateDiscount);
                const { discountType, discountValue, unitType, appliedProducts } = data.immediateDiscount;
                
                const updatedProducts = data.products.map((product: Product) => {
                  if (appliedProducts.includes(product.product_id)) {
                    const basePrice = Number(product.pricing_price) || 0;
                    let newPrice;
                    
                    if (unitType === '%') {
                      // 퍼센트 할인의 경우 100으로 나누어 계산
                      newPrice = calculateDiscount(basePrice, discountValue / 100, 'round', '0.01', data.selectedChannelInfo);
                    } else {
                      // 금액 할인의 경우 그대로 사용
                      newPrice = calculateDiscount(basePrice, discountValue, 'round', '0.01', data.selectedChannelInfo);
                    }
                    
                    const updatedProduct = { ...product };
                    updatedProduct.discount_price = newPrice;
                    updatedProduct.discount = Number(product.pricing_price) - newPrice;
                    updatedProduct.discount_rate = ((Number(product.pricing_price) - newPrice) / Number(product.pricing_price)) * 100;
                    updatedProduct.discount_unit = unitType;

                    // 예상수수료, 정산예정금액, 예상순이익 재계산
                    if (data.selectedChannelInfo) {
                      updatedProduct.expected_settlement_amount = calculateSettlementAmount(updatedProduct);
                      updatedProduct.expected_net_profit = calculateNetProfit(updatedProduct, data.selectedChannelInfo);
                      updatedProduct.expected_commission_fee = calculateCommissionFee(updatedProduct, data.selectedChannelInfo, isFeeDiscountEnabled);
                    }

                    return updatedProduct;
                  }
                  return product;
                });
                
                setProducts(updatedProducts);
                console.log('즉시할인 적용 완료');
              }
            }
          }
        } else {
          console.log('파이어베이스 문서가 존재하지 않습니다.');
        }
      } catch (error) {
        console.error('세션 또는 장바구니 데이터 로드 오류:', error);
        toast({
          description: <div className="flex items-center gap-2"><CircleAlert className="h-5 w-5" /> 장바구니 데이터를 로드하는데 실패했습니다.</div>,
          variant: "destructive"
        });
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
    const loadChannels = async () => {
      try {
        const response = await fetch('/api/channels');
        if (!response.ok) {
          throw new Error('채널 정보를 가져오는데 실패했습니다.');
        }
        const data = await response.json();
        if (data.channels) {
          // 중복 제거 및 정렬
          const uniqueChannels = Array.from(new Set(data.channels.map((c: ChannelInfo) => c.channel_name_2)))
            .map(name => data.channels.find((c: ChannelInfo) => c.channel_name_2 === name))
            .sort((a: ChannelInfo, b: ChannelInfo) => a.channel_name_2.localeCompare(b.channel_name_2));
          setChannels(uniqueChannels);
        }
      } catch (error) {
        console.error('채널 정보 로드 오류:', error);
        toast({
          description: <div className="flex items-center gap-2"><CircleAlert className="h-5 w-5" /> 채널 정보를 불러오는데 실패했습니다.</div>,
          variant: "destructive"
        });
      }
    };

    loadChannels();
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
      
  // 채널 선택 핸들러
  const handleChannelSelection = async (channelInfo: ChannelInfo) => {
    if (!user) return;
    
    try {
      const docRef = doc(db, 'userCarts', user.uid);
      await setDoc(docRef, {
        selectedChannelInfo: channelInfo,
        channel_name_2: channelInfo.channel_name_2,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      setSelectedChannel(channelInfo.channel_name_2);
      setSelectedChannelInfo(channelInfo);
      setFilters(prev => ({
        ...prev,
        channel_name_2: channelInfo.channel_name_2
      }));

      // 계산 실행
      const updatedProducts = products.map(product => ({
        ...product,
        pricing_price: calculateChannelPrice(product, channelInfo),
        logistics_cost: calculateLogisticsCost(channelInfo, deliveryType || 'conditional', Number(channelInfo.amazon_shipping_cost)),
        expected_commission_fee: calculateCommissionFee(product, channelInfo, isAdjustFeeEnabled),
        expected_net_profit: calculateNetProfit(product, channelInfo),
        expected_settlement_amount: calculateSettlementAmount(product),
        cost_ratio: calculateCostRatio(product, channelInfo)
      }));
      
      setProducts(updatedProducts);
    } catch (error) {
      console.error('채널 정보 저장 실패:', error);
      toast({
        description: <div className="flex items-center gap-2"><CircleAlert className="h-5 w-5" /> 채널 정보 저장에 실패했습니다.</div>,
        variant: "destructive"
      });
    }
  };

  // 배송조건 변경 핸들러
  const handleDeliveryTypeChange = async (value: string) => {
    if (!user) return;
    
    try {
      const docRef = doc(db, 'userCarts', user.uid);
      await setDoc(docRef, {
        delivery_type: value,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      setDeliveryType(value);
      setIsValidDeliveryType(true);
      setFilters(prev => ({
        ...prev,
        delivery_type: value
      }));
      
      // 물류비 재계산
      if (selectedChannelInfo) {
        const updatedProducts = products.map(product => ({
          ...product,
          logistics_cost: calculateLogisticsCost(selectedChannelInfo, value, Number(selectedChannelInfo.amazon_shipping_cost))
        }));
        setProducts(updatedProducts);
      }
    } catch (error) {
      console.error('배송조건 저장 실패:', error);
      toast({
        description: <div className="flex items-center gap-2"><CircleAlert className="h-5 w-5" /> 배송조건 저장에 실패했습니다.</div>,
        variant: "destructive"
      });
    }
  };

  // 즉시할인 적용 핸들러
  const handleImmediateDiscountApply = async (discountData: {
    discountType: string;
    discountValue: number;
    unitType: string;
    appliedProducts: string[];
  }) => {
    if (!user) return;
    
    try {
      const docRef = doc(db, 'userCarts', user.uid);
      await setDoc(docRef, {
        immediateDiscount: {
          ...discountData,
          updatedAt: new Date().toISOString()
        },
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      // 할인 적용 및 재계산
      const updatedProducts = products.map(product => {
        if (!discountData.appliedProducts.includes(product.product_id)) return product;
        
        const basePrice = product.pricing_price || 0;
        const discountAmount = discountData.unitType === '%' 
          ? basePrice * (discountData.discountValue / 100)
          : discountData.discountValue;
        
        const newPrice = basePrice - discountAmount;
        
        return {
          ...product,
          discount_price: newPrice,
          discount: discountAmount,
          discount_rate: discountData.unitType === '%' ? discountData.discountValue : (discountAmount / basePrice) * 100,
          discount_unit: discountData.unitType
        };
      });
      
      setProducts(updatedProducts);
    } catch (error) {
      console.error('즉시할인 저장 실패:', error);
      toast({
        description: <div className="flex items-center gap-2"><CircleAlert className="h-5 w-5" /> 즉시할인 저장에 실패했습니다.</div>,
        variant: "destructive"
      });
    }
  };

  // 쿠폰 적용 핸들러
  const handleCouponApply = async (
    couponType: '1' | '2' | '3',
    couponData: {
      product_id: string;
      hurdleTarget: string;
      hurdleAmount: number;
      discountBase: string;
      discountType: string;
      discountValue: number;
      roundUnit: string;
      roundType: string;
      discountCap: number;
      selfRatio: number;
    }[]
  ) => {
    if (!user) return;
    
    try {
      const docRef = doc(db, 'userCarts', user.uid);
      await setDoc(docRef, {
        [`coupon${couponType}Discount`]: couponData,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      // 쿠폰 적용 및 재계산
      const updatedProducts = products.map(product => {
        const couponInfo = couponData.find(c => c.product_id === product.product_id);
        if (!couponInfo) return product;
        
        const basePrice = product[couponInfo.discountBase as keyof Product] as number || 0;
        const discountAmount = couponInfo.discountType === '%'
          ? basePrice * (couponInfo.discountValue / 100)
          : couponInfo.discountValue;
        
        const newPrice = basePrice - discountAmount;
        
        return {
          ...product,
          [`coupon_price_${couponType}`]: newPrice,
          [`coupon_discount_${couponType}`]: discountAmount,
          [`coupon_rate_${couponType}`]: couponInfo.discountType === '%' ? couponInfo.discountValue : (discountAmount / basePrice) * 100
        };
      });
      
      setProducts(updatedProducts);
    } catch (error) {
      console.error('쿠폰 저장 실패:', error);
      toast({
        description: <div className="flex items-center gap-2"><CircleAlert className="h-5 w-5" /> 쿠폰 저장에 실패했습니다.</div>,
        variant: "destructive"
      });
    }
  };

  // 날짜 선택 핸들러 수정
  const handleDateSelect = (range: DateRange | undefined) => {
    if (range?.from) {
      setStartDate(format(range.from, 'yyyy-MM-dd'));
    }
    if (range?.to) {
      setEndDate(format(range.to, 'yyyy-MM-dd'));
    }
  };

  // 날짜 퀵 선택 버튼 핸들러
  const handleQuickDateSelect = (period: 'today' | 'yesterday' | 'week' | 'month') => {
    const today = new Date();
    let targetStartDate = '';
    let targetEndDate = '';

    if (period === 'today') {
      targetStartDate = today.toISOString().split('T')[0];
      targetEndDate = targetStartDate;
    } else if (period === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      targetStartDate = yesterday.toISOString().split('T')[0];
      targetEndDate = targetStartDate;
    } else if (period === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      targetStartDate = weekAgo.toISOString().split('T')[0];
      targetEndDate = today.toISOString().split('T')[0];
    } else if (period === 'month') {
      const monthAgo = new Date(today);
      monthAgo.setMonth(today.getMonth() - 1);
      targetStartDate = monthAgo.toISOString().split('T')[0];
      targetEndDate = today.toISOString().split('T')[0];
    }
    
    setStartDate(targetStartDate);
    setEndDate(targetEndDate);
  };

  // 메모 변경 핸들러들
  const handleMemo1Change = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMemo1(value);
  };

  const handleMemo2Change = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMemo2(value);
  };

  const handleMemo3Change = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMemo3(value);
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
    if (selectedProducts.length === 0) {
      toast({
        description: <div className="flex items-center gap-2"><CircleAlert className="h-5 w-5" /> 선택된 상품이 없습니다.</div>,
        variant: "destructive"
      });
      return;
    }
    
    const updatedProducts = products.filter(p => !selectedProducts.includes(p.product_id));
    setProducts(updatedProducts);
    setSelectedProducts([]);
    
    // 되돌리기 기능에 기록
    recordStateChange('PRODUCT_REMOVE', selectedProducts, '선택된 상품 삭제');

    toast({
      description: <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5" /> {selectedProducts.length}개의 상품이 삭제되었습니다.</div>,
    });
  };

  // 초기화 핸들러
  const handleReset = async () => {
    if (!user) return;
    
    if (!confirm('정말로 목록을 초기화하시겠습니까?')) return;

    try {
      const docRef = doc(db, 'userCarts', user.uid);
      await setDoc(docRef, {
        title: '',
        channel_name_2: '',
        delivery_type: '',
        start_date: '',
        end_date: '',
        memo1: '',
        memo2: '',
        memo3: '',
        fee_discount: false,
        productIds: [],
        selectedChannelInfo: null,
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
      setFilters({ channel_name_2: '', delivery_type: '' });
      setSelectedProducts([]);
      setSelectedChannelInfo(null);
      setIsValidChannel(true);
      setIsValidDeliveryType(true);

      alert('목록이 초기화되었습니다.');
    } catch (error) {
      console.error('목록 초기화 실패:', error);
      alert('목록 초기화에 실패했습니다.');
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
    { key: "adjusted_cost", label: "조정원가", format: (value: number) => value ? value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '-' },
    { key: "expected_commission_fee", label: "예상수수료", format: (value: number) => value?.toLocaleString() || '-' },
    { key: "logistics_cost", label: "물류비", format: (value: number) => value ? value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '-' },
    { key: "expected_net_profit", label: "예상순이익액", format: (value: number) => value ? value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '-' },
    { key: "expected_net_profit_margin", label: "예상순이익률", format: (value: number) => value ? `${(value * 100).toFixed(1)}%` : '-' },
    { key: "expected_settlement_amount", label: "정산예정금액", format: (value: number) => value?.toLocaleString() || '-' },
    { key: "cost_ratio", label: "원가율", format: (value: number) => value ? `${value.toFixed(2)}%` : '-' },
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
      // await saveCartInfo(); 제거
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const handleChannelSelect = (value: string) => {
    const selectedChannelInfo = channels.find(channel => channel.channel_name_2 === value);
    if (selectedChannelInfo) {
      handleChannelSelection(selectedChannelInfo);
    }
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
        description: <div className="flex items-center gap-2"><CircleAlert className="h-5 w-5" /> 저장된 계산 데이터가 없습니다.</div>,
        variant: "destructive"
      });
      return;
    }

    const checkedProducts = products.filter(p => selectedProducts.includes(p.product_id));
    console.log(`[handleRevertCalculations] 체크된 상품 수: ${checkedProducts.length}`);
    
    if (checkedProducts.length === 0) {
      console.log('[handleRevertCalculations] 선택된 상품이 없음');
      toast({
        description: <div className="flex items-center gap-2"><CircleAlert className="h-5 w-5" /> 선택된 상품이 없습니다.</div>,
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
        return {
          ...savedProduct,
          // 배송비는 현재 배송조건으로 계산
          logistics_cost: selectedChannelInfo 
            ? calculateLogisticsCost(
                selectedChannelInfo, 
                deliveryType,  // 현재 선택된 배송조건 사용
                Number(selectedChannelInfo.amazon_shipping_cost)
              )
            : 0
        };
      }
      return product;
    });

    console.log('[handleRevertCalculations] 상태 업데이트');
    setProducts(revertedProducts);
    
    console.log('[handleRevertCalculations] 토스트 메시지 표시');
    toast({
      description: <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5" /> {checkedProducts.length}개 상품의 계산 데이터를 되돌렸습니다.</div>,
    });
    
    console.log('[handleRevertCalculations] END');
  };

  // 조정원가 설정 핸들러
  const handleSetAdjustedCost = async () => {
    if (!selectedProducts.length) {
      toast({
        description: <div className="flex items-center gap-2"><CircleAlert className="h-5 w-5" /> 선택된 상품이 없습니다.</div>,
      });
      return;
    }

    const costValue = parseFloat(adjustCostValue.replace(/,/g, ''));
    if (isNaN(costValue)) {
      toast({
        description: <div className="flex items-center gap-2"><CircleAlert className="h-5 w-5" /> 올바른 금액을 입력해주세요.</div>,
      });
      return;
    }

    const updatedProducts = products.map(product => {
      if (selectedProducts.includes(product.product_id)) {
        return {
          ...product,
          adjusted_cost: costValue
        };
      }
      return product;
    });

    setProducts(updatedProducts);
    setShowAdjustCostModal(false);
    setAdjustCostValue('');

    toast({
      description: <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5" /> {selectedProducts.length}개 상품의 조정원가가 설정되었습니다.</div>,
    });
  };

  // 공통 포맷팅 함수 추가
  const formatNumber = (value: number, channelInfo: ChannelInfo | null) => {
    if (!value) return '-';
    if (channelInfo && (channelInfo.currency_2 === 'USD' || channelInfo.currency_2 === 'SGD')) {
      return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    return Math.round(value).toLocaleString();
  };

  // useAutoSave 훅 사용 부분 수정 (1644줄 근처)
  const { isSaving, lastSaved } = useAutoSave({
    title,
    channel_name_2: selectedChannelInfo?.channel_name_2 || '',
    delivery_type: deliveryType,
    start_date: startDate,
    end_date: endDate,
    memo1,
    memo2,
    memo3,
    fee_discount: isAdjustFeeEnabled,
    productIds: products.map(p => p.product_id),
    selectedChannelInfo,
    immediateDiscount: selectedProducts.length > 0 ? {
      discountType: discountType || 'amount',
      discountValue: discountValue || 0,
      unitType: discountUnit || '%',
      appliedProducts: selectedProducts,
      updatedAt: new Date().toISOString()
    } : undefined
  }, user);

  // 상품 데이터가 로드된 후 계산을 실행하는 useEffect 추가
  useEffect(() => {
    if (products.length > 0 && selectedChannelInfo) {
      // shop_product_id 가져오기
      const fetchShopProductIds = async () => {
        try {
          const response = await fetch(`/api/shop-product-ids?channel=${encodeURIComponent(selectedChannel)}`);
          if (!response.ok) {
            throw new Error(`API 요청 실패: ${response.status}`);
          }
          
          const data = await response.json() as { 
            success: boolean; 
            shopProductIds?: Record<string, string>;
            error?: string;
          };
          
          const shopProductIds = new Map<string, string>();
          
          if (data.success && data.shopProductIds) {
            Object.entries(data.shopProductIds).forEach(([productId, shopProductId]) => {
              shopProductIds.set(productId, shopProductId as string);
            });
          }

          // 제품 가격 계산 및 업데이트
          const updatedProducts = products.map(product => {
            const pricing_price = calculateChannelPrice(product, selectedChannelInfo);
            const logistics_cost = calculateLogisticsCost(selectedChannelInfo, deliveryType || 'conditional', Number(selectedChannelInfo.amazon_shipping_cost));
            const expected_commission_fee = calculateCommissionFee(product, selectedChannelInfo, isFeeDiscountEnabled);
            const expected_commission_fee_rate = calculateAdjustedFeeRate(product, selectedChannelInfo, isFeeDiscountEnabled);
            const expected_net_profit = calculateNetProfit(product, selectedChannelInfo);
            const expected_net_profit_margin = calculateProfitMargin(product, selectedChannelInfo);
            const expected_settlement_amount = calculateSettlementAmount(product);
            const cost_ratio = calculateCostRatio(product, selectedChannelInfo);
            const shop_product_id = shopProductIds.get(product.product_id);

            return {
              ...product,
              pricing_price,
              logistics_cost,
              expected_commission_fee,
              expected_commission_fee_rate,
              expected_net_profit,
              expected_net_profit_margin,
              expected_settlement_amount,
              cost_ratio,
              shop_product_id
            };
          });

          setProducts(updatedProducts);
        } catch (error) {
          console.error('채널 정보 처리 중 오류:', error);
        }
      };

      fetchShopProductIds();
    }
  }, [selectedChannel, selectedChannelInfo, deliveryType, isFeeDiscountEnabled]); // products 제거

  // 할인 계산 함수
  const calculateDiscount = (
    basePrice: number,
    discountValue: number,
    roundingType: 'round' | 'floor' | 'ceil',
    unit: string,
    channelInfo: ChannelInfo | null
  ): number => {
    if (!channelInfo) return basePrice;

    let newPrice = basePrice;
    
    // 퍼센트 할인인 경우
    if (unit === '%') {
      newPrice = basePrice * (1 - discountValue / 100);
    } else {
      // 금액 할인인 경우
      newPrice = basePrice - discountValue;
    }

    // 반올림 처리
    switch (roundingType) {
      case 'round':
        newPrice = Math.round(newPrice);
        break;
      case 'floor':
        newPrice = Math.floor(newPrice);
        break;
      case 'ceil':
        newPrice = Math.ceil(newPrice);
        break;
    }

    // 최소 가격 체크
    const minPrice = Number(channelInfo.min_price) || 0;
    if (minPrice > 0 && newPrice < minPrice) {
      newPrice = minPrice;
    }

    return newPrice;
  };

  // Firebase에서 데이터 복원
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const docRef = doc(db, 'userCarts', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // 1. 채널 선택 데이터 복원
          if (data.selectedChannelInfo) {
            console.log('채널 정보 복원:', data.selectedChannelInfo);
            setSelectedChannelInfo(data.selectedChannelInfo);
            setSelectedChannel(data.selectedChannelInfo.channel_name_2);
            setChannelSearchTerm(data.selectedChannelInfo.channel_name_2);
            setFilters(prev => ({ ...prev, channel_name_2: data.selectedChannelInfo.channel_name_2 }));
            
            // 채널 정보 기반 계산 실행
            if (data.products) {
              const updatedProducts = data.products.map((product: Product) => ({
                ...product,
                pricing_price: calculateChannelPrice(product, data.selectedChannelInfo),
                logistics_cost: calculateLogisticsCost(data.selectedChannelInfo, data.delivery_type || 'conditional', Number(data.selectedChannelInfo.amazon_shipping_cost)),
                expected_commission_fee: calculateCommissionFee(product, data.selectedChannelInfo, data.fee_discount || false),
                expected_net_profit: calculateNetProfit(product, data.selectedChannelInfo),
                expected_settlement_amount: calculateSettlementAmount(product),
                cost_ratio: calculateCostRatio(product, data.selectedChannelInfo)
              }));
              setProducts(updatedProducts);
            }
          }
          
          // 2. 배송조건 데이터 복원
          if (data.delivery_type) {
            setDeliveryType(data.delivery_type);
            setFilters(prev => ({ ...prev, delivery_type: data.delivery_type }));
            
            // 물류비 재계산
            if (data.selectedChannelInfo && data.products) {
              const updatedProducts = data.products.map((product: Product) => ({
                ...product,
                logistics_cost: calculateLogisticsCost(data.selectedChannelInfo, data.delivery_type, Number(data.selectedChannelInfo.amazon_shipping_cost))
              }));
              setProducts(updatedProducts);
            }
          }
          
          // 3. 즉시할인 데이터 복원
          if (data.immediateDiscount && data.products) {
            const { discountType, discountValue, unitType, appliedProducts } = data.immediateDiscount;
            const updatedProducts = data.products.map((product: Product) => {
              if (!appliedProducts.includes(product.product_id)) return product;
              
              const basePrice = product.pricing_price || 0;
              const discountAmount = unitType === '%' 
                ? basePrice * (discountValue / 100)
                : discountValue;
              
              const newPrice = basePrice - discountAmount;
              
              return {
                ...product,
                discount_price: newPrice,
                discount: discountAmount,
                discount_rate: unitType === '%' ? discountValue : (discountAmount / basePrice) * 100,
                discount_unit: unitType
              };
            });
            setProducts(updatedProducts);
          }
          
          // 4. 쿠폰 데이터 복원
          if (data.products) {
            let updatedProducts = [...data.products];
            
            // 쿠폰1 복원
            if (data.coupon1Discount) {
              updatedProducts = updatedProducts.map(product => {
                const couponInfo = data.coupon1Discount.find((c: CouponDiscount) => c.product_id === product.product_id);
                if (!couponInfo) return product;
                
                const basePrice = product[couponInfo.discountBase as keyof Product] as number || 0;
                const discountAmount = couponInfo.discountType === '%'
                  ? basePrice * (couponInfo.discountValue / 100)
                  : couponInfo.discountValue;
                
                const newPrice = basePrice - discountAmount;
                
                return {
                  ...product,
                  coupon_price_1: newPrice,
                  coupon_discount_1: discountAmount,
                  coupon_rate_1: couponInfo.discountType === '%' ? couponInfo.discountValue : (discountAmount / basePrice) * 100
                };
              });
            }
            
            // 쿠폰2 복원
            if (data.coupon2Discount) {
              updatedProducts = updatedProducts.map(product => {
                const couponInfo = data.coupon2Discount.find((c: CouponDiscount) => c.product_id === product.product_id);
                if (!couponInfo) return product;
                
                const basePrice = product[couponInfo.discountBase as keyof Product] as number || 0;
                const discountAmount = couponInfo.discountType === '%'
                  ? basePrice * (couponInfo.discountValue / 100)
                  : couponInfo.discountValue;
                
                const newPrice = basePrice - discountAmount;
                
                return {
                  ...product,
                  coupon_price_2: newPrice,
                  coupon_discount_2: discountAmount,
                  coupon_rate_2: couponInfo.discountType === '%' ? couponInfo.discountValue : (discountAmount / basePrice) * 100
                };
              });
            }
            
            // 쿠폰3 복원
            if (data.coupon3Discount) {
              updatedProducts = updatedProducts.map(product => {
                const couponInfo = data.coupon3Discount.find((c: CouponDiscount) => c.product_id === product.product_id);
                if (!couponInfo) return product;
                
                const basePrice = product[couponInfo.discountBase as keyof Product] as number || 0;
                const discountAmount = couponInfo.discountType === '%'
                  ? basePrice * (couponInfo.discountValue / 100)
                  : couponInfo.discountValue;
                
                const newPrice = basePrice - discountAmount;
                
                return {
                  ...product,
                  coupon_price_3: newPrice,
                  coupon_discount_3: discountAmount,
                  coupon_rate_3: couponInfo.discountType === '%' ? couponInfo.discountValue : (discountAmount / basePrice) * 100
                };
              });
            }
            
            setProducts(updatedProducts);
          }
          
          // 5. 기타 데이터 복원
          if (data.title) setTitle(data.title);
          if (data.memo1) setMemo1(data.memo1);
          if (data.memo2) setMemo2(data.memo2);
          if (data.memo3) setMemo3(data.memo3);
          if (data.fee_discount !== undefined) setIsAdjustFeeEnabled(data.fee_discount);
        }
      } catch (error) {
        console.error('데이터 로드 중 오류 발생:', error);
        toast({
          description: <div className="flex items-center gap-2"><CircleAlert className="h-5 w-5" /> 저장된 데이터를 불러오는 중 오류가 발생했습니다.</div>,
          variant: "destructive"
        });
      }
    };

    loadSavedData();
  }, []);

  // 계산 함수 사용 부분 수정
  const calculateProductValues = (product: Product) => {
    if (!selectedChannelInfo) return;

    // 기본 원가 계산
    const baseCost = calculateBaseCost(product, selectedChannelInfo);
    
    // 할인율 계산
    const immediateDiscountRate = calculateImmediateDiscountRate(product);
    const coupon1DiscountRate = calculateCoupon1DiscountRate(product);
    const coupon2DiscountRate = calculateCoupon2DiscountRate(product);
    const coupon3DiscountRate = calculateCoupon3DiscountRate(product);
    const finalDiscountRate = calculateFinalDiscountRate(product);
    
    // 조정된 원가 계산
    const adjustedCost = calculateAdjustedCost(product);
    
    // 수수료 계산
    const commissionFee = calculateCommissionFee(product, selectedChannelInfo, isAdjustFeeEnabled);
    const adjustedFeeRate = calculateAdjustedFeeRate(product, selectedChannelInfo, isAdjustFeeEnabled);
    
    // 물류비 계산
    const logisticsCost = calculateLogisticsCost(selectedChannelInfo, deliveryType, selectedChannelInfo.amazon_shipping_cost || 0);
    
    // 순이익 계산
    const netProfit = calculateNetProfit(product, selectedChannelInfo);
    const profitMargin = calculateProfitMargin(product, selectedChannelInfo);
    
    // 정산금액 계산
    const settlementAmount = calculateSettlementAmount(product);
    
    // 원가율 계산
    const costRatio = calculateCostRatio(product, selectedChannelInfo);

    return {
      baseCost,
      immediateDiscountRate,
      coupon1DiscountRate,
      coupon2DiscountRate,
      coupon3DiscountRate,
      finalDiscountRate,
      adjustedCost,
      commissionFee,
      adjustedFeeRate,
      logisticsCost,
      netProfit,
      profitMargin,
      settlementAmount,
      costRatio
    };
  };

  return (
    <ToastProvider>
      <div className="container mx-auto py-4"> 
        
        {/* 편집 섹션 */}
        <Card className="mb-6 py-5 px-5 bg-card rounded-lg shadow-sm">
          <CardContent className="p-0">
            <div className="flex flex-col gap-6">
              <div className="text-sm text-gray-500">
                <span className="mr-4">UUID : {listUuid}</span>
                <span className="mr-4">작성자 : {user?.uid === 'a8mwwycqhaZLIb9iOcshPbpAVrj2' ? '한재훈' :
                 user?.uid === 'MhMI2KxbxkPHIAJP0o4sPSZG35e2' ? '이세명' :
                 user?.uid === '6DnflkbFSifLCNVQGWGv7aqJ2w72' ? '박연수' : ''}</span>
                <span className="mr-4">상품 : {products.length}개</span>
                {selectedChannelInfo?.average_fee_rate && (<span className="mr-4 rounded-md shadow-sm bg-muted px-2 py-1">평균수수료 : {parseFloat(selectedChannelInfo.average_fee_rate).toFixed(1)}%</span>)}
                {products.length > 0 && (
                  <> 
                    <span className="mr-4 rounded-md shadow-sm bg-muted px-2 py-1">
                      평균할인율 : {calculateAverageDiscountRate(products).toFixed(1)}%
                    </span>
                    <span className="mr-4 rounded-md shadow-sm bg-muted px-2 py-1">
                      평균원가율 : {selectedChannelInfo ? calculateAverageCostRatio(products).toFixed(1) : 0}%
                    </span>
                    <span className="mr-4 rounded-md shadow-sm bg-muted px-2 py-1">
                      평균순이익률 : {selectedChannelInfo ? calculateAverageProfitMargin(products, selectedChannelInfo).toFixed(1) : 0}%
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
                    className={`w-[300px] h-10 px-3 border-[0px] border-b-[1px] focus:border-b-[0px] focus:outline-none focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 text-sm ${
                      title ? 'border-blue-500 focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 bg-muted' : 'border-input bg-background'
                    }`}
                  />
                  <Select 
                    value={selectedChannel} 
                    onValueChange={handleChannelSelect}
                  >
                    <SelectTrigger className={`w-[200px] ${
                      selectedChannel ? 'border-blue-500 focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 bg-blue-50' : ''
                    }`}>
                      <SelectValue placeholder="채널 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {channels.map((channel) => (
                        <SelectItem key={channel.channel_name_2} value={channel.channel_name_2}>
                          {channel.channel_name_2}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    <SelectTrigger className={`w-[120px] ${
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
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-[300px] justify-start text-left font-normal",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {startDate && endDate ? (
                            <>
                              {format(new Date(startDate), 'PPP', { locale: ko })} -{" "}
                              {format(new Date(endDate), 'PPP', { locale: ko })}
                            </>
                          ) : (
                            <span>날짜 선택</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-50" align="start">
                        <CalendarComponent
                          mode="range"
                          defaultMonth={new Date(startDate || new Date())}
                          selected={{ from: startDate ? new Date(startDate) : undefined, to: endDate ? new Date(endDate) : undefined }}
                          onSelect={handleDateSelect}
                          locale={ko}
                          numberOfMonths={2}
                          className="border-0"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* 메모 입력창 수정 */}
                <div className="w-full flex gap-4">
                  <div className="relative w-full">
                    <textarea
                      value={memo1}
                      onChange={handleMemo1Change}
                      placeholder="메모 1"
                      className={`w-full h-10 px-3 border-[0px] border-b-[1px] focus:border-b-[0px] focus:outline-none focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 text-sm ${
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
                      className={`w-full h-10 px-3 border-[0px] border-b-[1px] focus:border-b-[0px] focus:outline-none focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 text-sm ${
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
                      className={`w-full h-10 px-3 border-[0px] border-b-[1px] focus:border-b-[0px] focus:outline-none focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 text-sm ${
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
                  onClick={() => setShowDividerModal(true)}
                  className="border-0 hover:bg-transparent hover:text-primary"
                >
                  구분자
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
                  onClick={() => setShowAdjustCostModal(true)} 
                  className="border-0 hover:bg-transparent hover:text-primary"
                >
                  조정원가
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
                              <TableHead className="text-center w-[80px]">채널코드</TableHead>
                              <TableHead className="text-center w-[70px]">이미지</TableHead>
                              <TableHead className="text-left w-[200px]">상품명</TableHead>
                              <TableHead className="text-center w-[80px]">판매가</TableHead> 
                              <TableHead className="text-center w-[80px]">즉시할인</TableHead>
                              <TableHead className="text-center w-[80px]">쿠폰1</TableHead>
                              <TableHead className="text-center w-[80px]">쿠폰2</TableHead>
                              <TableHead className="text-center w-[80px]">쿠폰3</TableHead>
                              <TableHead className="text-center w-[80px]">최종할인</TableHead>
                              <TableHead className="text-center w-[90px]">할인부담</TableHead>
                              <TableHead className="text-center w-[80px]">조정원가</TableHead>
                              <TableHead className="text-center w-[100px]">예상수수료</TableHead>
                              <TableHead className="text-center w-[80px]">물류비</TableHead>
                              <TableHead className="text-center w-[100px]">예상순이익</TableHead>
                              <TableHead className="text-center w-[100px]">정산예정금</TableHead>
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
                                <DraggableCell className="text-center">{/* 쇼핑몰상품코드 */}
                                  <div>{product.shop_product_id || '-'}</div>
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
                                  <div>{product.pricing_price ? formatNumber(product.pricing_price, selectedChannelInfo) : '-'}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {selectedChannelInfo && product.org_price 
                                      ? formatNumber(calculateBaseCost(product, selectedChannelInfo), selectedChannelInfo)
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
                                  <div>{product.discount_burden_amount ? formatNumber(product.discount_burden_amount, selectedChannelInfo) : '-'}</div>
                                </DraggableCell>
                                <DraggableCell className="text-center">{/* 조정원가 */}
                                  <div>{calculateAdjustedCost(product) ? formatNumber(calculateAdjustedCost(product), selectedChannelInfo) : '-'}</div>
                                </DraggableCell>
                                <DraggableCell className="text-center">{/* 예상수수료 */}
                                  <div>
                                    {selectedChannelInfo 
                                      ? formatNumber(calculateCommissionFee(product, selectedChannelInfo, isAdjustFeeEnabled), selectedChannelInfo)
                                      : '-'}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {selectedChannelInfo 
                                      ? `${calculateAdjustedFeeRate(product, selectedChannelInfo, isAdjustFeeEnabled).toFixed(1)}%` 
                                      : '-'}
                                  </div>
                                </DraggableCell>
                                <DraggableCell className="text-center">{/* 물류비 */}
                                  <div>
                                    {selectedChannelInfo && deliveryType
                                      ? formatNumber(calculateLogisticsCost(selectedChannelInfo, deliveryType, Number(selectedChannelInfo.amazon_shipping_cost)), selectedChannelInfo)
                                      : '0'}
                                  </div>
                                </DraggableCell>
                                <DraggableCell className="text-center">{/* 예상순이익 */}
                                  <div>
                                    {selectedChannelInfo 
                                      ? formatNumber(calculateNetProfit(product, selectedChannelInfo), selectedChannelInfo)
                                      : '-'}
                                  </div>
                                  <div className="text-sm text-gray-500 mt-1">
                                    {selectedChannelInfo && product.pricing_price
                                      ? `${(calculateProfitMargin(product, selectedChannelInfo) * 100).toFixed(1)}%`
                                      : '-'}
                                  </div>
                                </DraggableCell>
                                <DraggableCell className="text-center">{/* 예상정산액 */}
                                  <div>{formatNumber(calculateSettlementAmount(product), selectedChannelInfo)}</div>
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
                      className={`w-8 h-10 rounded-full cursor-pointer border-2 ${
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
            userId={user?.uid}
          />
          {/* 조정원가 설정 모달 */}
          <Dialog open={showAdjustCostModal} onOpenChange={setShowAdjustCostModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>조정원가 설정</DialogTitle>
                <DialogDescription>
                  선택된 {selectedProducts.length}개 상품의 조정원가를 설정합니다.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="adjustCost" className="text-right">
                    조정원가
                  </Label>
                  <Input
                    id="adjustCost"
                    value={adjustCostValue}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9,]/g, '');
                      setAdjustCostValue(value);
                    }}
                    className="col-span-3"
                    placeholder="금액을 입력하세요"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAdjustCostModal(false)}>
                  취소
                </Button>
                <Button onClick={handleSetAdjustedCost}>
                  설정
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </ToastProvider>
    );
  }
