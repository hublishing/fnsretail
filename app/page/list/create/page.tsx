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
  //immediateDiscount?: {
  //  discountType: string;
  //  discountValue: number;
  //  unitType: string;
  //  appliedProducts: string[];
  //  updatedAt: string;
  //};
}

export default function CartPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([])
  const [user, setUser] = useState<User | null>(null);
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
  const [immediateDiscount, setImmediateDiscount] = useState<{
    discountType: string;
    discountValue: number;
    unitType: string;
    appliedProducts: string[];
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

  // 쿠폰 할인 상태 추가
  const [coupon1Discount, setCoupon1Discount] = useState<CouponDiscount[]>([]);
  const [coupon2Discount, setCoupon2Discount] = useState<CouponDiscount[]>([]);
  const [coupon3Discount, setCoupon3Discount] = useState<CouponDiscount[]>([]);

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
 * 쿠폰 할인 적용 핸들러
 * @param products 업데이트된 상품 목록 (모달에서 이미 계산된 값 포함)
 * @param couponType 적용된 쿠폰 타입 (coupon1, coupon2, coupon3 중 하나)
 */
  const handleApplyDiscount = (products: Product[], couponType?: 'coupon1' | 'coupon2' | 'coupon3') => {
    console.log('=== handleApplyDiscount 시작 ===');
    console.log('입력된 상품:', products);
    console.log('쿠폰 타입:', couponType);
    
    // 입력된 상품의 쿠폰 가격 정보 확인
    const couponPriceInfo = products.map(p => ({
      product_id: p.product_id,
      product_name: p.product_name,
      discount_price: p.discount_price,
      coupon_price_1: p.coupon_price_1,
      coupon_price_2: p.coupon_price_2,
      coupon_price_3: p.coupon_price_3
    }));
    console.log('상품별 쿠폰 가격 정보:', couponPriceInfo);
    
    // 모달에서 계산된 상품 정보 그대로 상태 업데이트
    setProducts(products);
    console.log('상품 상태 업데이트 완료');
    
    // 쿠폰 할인 데이터를 Firebase에 저장
    if (user) {
      try {
        console.log('Firebase 저장 시작, 사용자:', user.uid);
        
        // undefined 값을 제거하는 함수 (재귀적으로 모든 객체 처리)
        const removeUndefined = (obj: any): any => {
          if (obj === undefined || obj === null) return null;
          if (typeof obj !== 'object') return obj;
          
          if (Array.isArray(obj)) {
            return obj.map(item => item === undefined ? null : removeUndefined(item));
          }
          
          const result: { [key: string]: any } = {};
          for (const key in obj) {
            if (obj[key] !== undefined) {
              result[key] = removeUndefined(obj[key]);
            }
          }
          return result;
        };
        
        // 상품 데이터에서 undefined 값 제거
        const cleanProducts = products.map(product => removeUndefined(product));
        
        // Firebase에 저장
        const docRef = doc(db, 'userCarts', user.uid);
        
        // 초기 데이터 구성
        let couponData: Record<string, any> = {
          updatedAt: new Date().toISOString(),
          products: cleanProducts, // undefined 값이 제거된 상품 배열 저장
        };
        console.log('Firebase에 저장할 공통 데이터:', { updatedAt: couponData.updatedAt, productsCount: cleanProducts.length });
        
        // 쿠폰 타입에 따라 선택적으로 데이터 추가 (쿠폰 메타데이터만 저장)
        if (couponType === 'coupon1') {
          // 쿠폰1 메타데이터 생성 (모달에서 이미 계산된 가격 사용)
          const coupon1Discount = products
            .filter(p => p.coupon_price_1 !== undefined)
            .map(p => ({
              product_id: p.product_id,
              hurdleTarget: 'discount_price',
              hurdleAmount: 0,
              discountBase: 'discount_price',
              discountType: 'amount' as const,
              // 모달에서 이미 계산된 가격 차이를 사용
              discountValue: Number(p.discount_price) - Number(p.coupon_price_1),
              roundUnit: 'none',
              roundType: 'ceil' as const,
              discountCap: 0,
              selfRatio: 0,
              decimalPoint: 'none' as const
            }));
          console.log('쿠폰1 할인 데이터:', coupon1Discount);
          
          const cleanCoupon1Data = coupon1Discount.map(c => removeUndefined(c));
          couponData.coupon1Discount = cleanCoupon1Data;
          
          // 로컬 상태 업데이트
          setCoupon1Discount(cleanCoupon1Data.map(c => ({
            product_id: c.product_id,
            discountType: c.discountType,
            discountValue: c.discountValue,
            unitType: 'amount',
            appliedProducts: [c.product_id],
            updatedAt: new Date().toISOString()
          })));
        } 
        else if (couponType === 'coupon2') {
          // 쿠폰2 메타데이터 생성 (모달에서 이미 계산된 가격 사용)
          const coupon2Discount = products
            .filter(p => p.coupon_price_2 !== undefined)
            .map(p => ({
              product_id: p.product_id,
              hurdleTarget: 'coupon_price_1',
              hurdleAmount: 0,
              discountBase: 'coupon_price_1',
              discountType: 'amount' as const,
              // 모달에서 이미 계산된 가격 차이를 사용
              discountValue: Number(p.coupon_price_1) - Number(p.coupon_price_2),
              roundUnit: 'none',
              roundType: 'ceil' as const,
              discountCap: 0,
              selfRatio: 0,
              decimalPoint: 'none' as const
            }));
          console.log('쿠폰2 할인 데이터:', coupon2Discount);
          
          const cleanCoupon2Data = coupon2Discount.map(c => removeUndefined(c));
          couponData.coupon2Discount = cleanCoupon2Data;
          
          // 로컬 상태 업데이트
          setCoupon2Discount(cleanCoupon2Data.map(c => ({
            product_id: c.product_id,
            discountType: c.discountType,
            discountValue: c.discountValue,
            unitType: 'amount',
            appliedProducts: [c.product_id],
            updatedAt: new Date().toISOString()
          })));
        }
        else if (couponType === 'coupon3') {
          // 쿠폰3 메타데이터 생성 (모달에서 이미 계산된 가격 사용)
          const coupon3Discount = products
            .filter(p => p.coupon_price_3 !== undefined)
            .map(p => ({
              product_id: p.product_id,
              hurdleTarget: 'coupon_price_2',
              hurdleAmount: 0,
              discountBase: 'coupon_price_2',
              discountType: 'amount' as const,
              // 모달에서 이미 계산된 가격 차이를 사용
              discountValue: Number(p.coupon_price_2) - Number(p.coupon_price_3),
              roundUnit: 'none',
              roundType: 'ceil' as const,
              discountCap: 0,
              selfRatio: 0,
              decimalPoint: 'none' as const
            }));
          console.log('쿠폰3 할인 데이터:', coupon3Discount);
          
          const cleanCoupon3Data = coupon3Discount.map(c => removeUndefined(c));
          couponData.coupon3Discount = cleanCoupon3Data;
          
          // 로컬 상태 업데이트
          setCoupon3Discount(cleanCoupon3Data.map(c => ({
            product_id: c.product_id,
            discountType: c.discountType,
            discountValue: c.discountValue,
            unitType: 'amount',
            appliedProducts: [c.product_id],
            updatedAt: new Date().toISOString()
          })));
        }
        
        // 최종 정제 과정 - undefined를 null로 변환하고 빈 객체 검사
        const finalCleanData = removeUndefined(couponData);
        console.log('최종 정제된 데이터 키:', Object.keys(finalCleanData));
        
        // Firebase에 저장
        if (Object.keys(finalCleanData).length > 1) {
          console.log('Firebase에 데이터를 저장합니다');
          
          // Firebase에 저장 - Promise를 반환하는 setDoc 사용
          setDoc(docRef, finalCleanData, { merge: true })
            .then(() => {
              console.log('쿠폰 할인 데이터 Firebase 저장 성공');
            })
            .catch((error) => {
              console.error('Firebase 저장 중 오류 발생:', error);
            });
        } else {
          console.log('저장할 쿠폰 데이터가 없습니다.');
        }
      } catch (error) {
        console.error('쿠폰 할인 데이터 처리 및 저장 중 오류:', error);
      }
    } else {
      console.log('사용자 정보가 없어 Firebase에 저장하지 않습니다.');
    }
    
    console.log('=== handleApplyDiscount 완료 ===');
  };

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
            }

            // 4. 즉시할인 정보가 있는 경우 적용
            //if (data.immediateDiscount) {
            //  console.log('즉시할인 정보 복원:', data.immediateDiscount);
            //  setImmediateDiscount(data.immediateDiscount);
            //}
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
  const handleImmediateDiscountApply = (products: Product[]) => {
    console.log('=== handleImmediateDiscountApply 시작 ===');
    console.log('입력된 상품:', products);
    setProducts(products);
    console.log('=== handleImmediateDiscountApply 완료 ===');
  };

  // 쿠폰 적용 핸들러
  const handleCouponApply = (products: Product[]) => {
    console.log('=== handleCouponApply 시작 ===');
    console.log('입력된 상품:', products);
    setProducts(products);
    console.log('=== handleCouponApply 완료 ===');
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
  const handleRemoveSelectedProducts = async () => {
    if (!user) return;
    
    if (selectedProducts.length === 0) {
      toast({
        description: <div className="flex items-center gap-2"><CircleAlert className="h-5 w-5" /> 선택된 상품이 없습니다.</div>,
        variant: "destructive"
      });
      return;
    }
    
    try {
      const updatedProducts = products.filter(p => !selectedProducts.includes(p.product_id));
      
      // Firebase에 저장할 데이터 정제
      const cleanProducts = updatedProducts.map(product => ({
        product_id: product.product_id,
        name: product.name || '',
        org_price: product.org_price || 0,
        shop_price: product.shop_price || 0,
        cost_ratio: product.cost_ratio || 0,
        total_stock: product.total_stock || 0,
        img_desc1: product.img_desc1 || '',
        category_3: product.category_3 || '',
        brand: product.brand || '',
        category_1: product.category_1 || '',
        extra_column2: product.extra_column2 || '',
        // 할인 관련 필드
        discount_price: product.discount_price || null,
        coupon_price_1: product.coupon_price_1 || null,
        coupon_price_2: product.coupon_price_2 || null,
        coupon_price_3: product.coupon_price_3 || null,
        discount_burden_amount: product.discount_burden_amount || 0,
        // 계산된 필드들
        logistics_cost: product.logistics_cost || 0,
        commission_fee: product.commission_fee || 0,
        adjusted_cost: product.adjusted_cost || 0
      }));
  
      // 로컬 상태 업데이트
      setProducts(updatedProducts);
      setSelectedProducts([]);
      
      // Firebase 업데이트
      const docRef = doc(db, 'userCarts', user.uid);
      await setDoc(docRef, {
        products: cleanProducts,
        productIds: cleanProducts.map(p => p.product_id),
        updatedAt: new Date().toISOString()
      }, { merge: true });
  
      toast({
        description: <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5" /> {selectedProducts.length}개의 상품이 삭제되었습니다.</div>,
      });
    } catch (error) {
      console.error('상품 삭제 실패:', error);
      toast({
        description: <div className="flex items-center gap-2"><CircleAlert className="h-5 w-5" /> 상품 삭제에 실패했습니다.</div>,
        variant: "destructive"
      });
    }
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
        hasDiscountPrice: products.some(p => p.discount_price),
        averageDiscountRate: calculateAverageDiscountRate(products).toFixed(1)
      });
    }
  }, [products]);

  // handleRevertCalculations 함수 수정
  const handleRevertCalculations = async () => {
    if (!user) {
      console.log('[초기화] 사용자 정보 없음');
      return;
    }
    
    if (!confirm('선택한 상품의 할인 정보를 초기화하시겠습니까?')) {
      console.log('[초기화] 사용자가 취소함');
      return;
    }

    try {
      console.log('[초기화] 시작:', {
        selectedProducts: selectedProducts.length,
        totalProducts: products.length
      });

      const docRef = doc(db, 'userCarts', user.uid);
      
      // undefined를 null로 변환하는 함수
      const replaceUndefinedWithNull = (obj: any): any => {
        if (obj === undefined) return null;
        if (obj === null) return null;
        if (typeof obj !== 'object') return obj;
        
        if (Array.isArray(obj)) {
          return obj.map(item => replaceUndefinedWithNull(item));
        }
        
        const result: any = {};
        for (const key in obj) {
          result[key] = replaceUndefinedWithNull(obj[key]);
        }
        return result;
      };

      // 선택된 상품들의 할인 정보 초기화
      const updatedProducts = products.map(product => {
        if (selectedProducts.includes(product.product_id)) {
          console.log('[초기화] 상품 초기화:', {
            productId: product.product_id,
            beforeDiscount: {
              discount_price: product.discount_price,
              coupon_price_1: product.coupon_price_1,
              coupon_price_2: product.coupon_price_2,
              coupon_price_3: product.coupon_price_3
            }
          });
          return {
            ...product,
            discount:null,
            discount_price: null,  // 즉시할인
            discount_rate: null,
            discount_unit: null,
            coupon_price_1: null,  // 쿠폰1
            coupon_price_2: null,  // 쿠폰2
            coupon_price_3: null   // 쿠폰3
          };
        }
        return product;
      });

      // 쿠폰 할인 배열의 discountValue 초기화
      const updatedCoupon1Discount = coupon1Discount.map((coupon: CouponDiscount) => ({
        ...coupon,
        discountValue: 0
      }));
      const updatedCoupon2Discount = coupon2Discount.map((coupon: CouponDiscount) => ({
        ...coupon,
        discountValue: 0
      }));
      const updatedCoupon3Discount = coupon3Discount.map((coupon: CouponDiscount) => ({
        ...coupon,
        discountValue: 0
      }));

      // Firebase에 업데이트할 데이터 준비 및 undefined를 null로 변환
      const updateData = replaceUndefinedWithNull({
        products: updatedProducts,
        coupon1Discount: updatedCoupon1Discount,
        coupon2Discount: updatedCoupon2Discount,
        coupon3Discount: updatedCoupon3Discount,
        updatedAt: new Date().toISOString()
      });

      console.log('[초기화] Firebase 업데이트 준비:', {
        productsCount: updateData.products.length,
        updatedAt: updateData.updatedAt,
        sampleProduct: updateData.products[0]
      });

      // Firebase 업데이트
      await setDoc(docRef, updateData, { merge: true });
      console.log('[초기화] Firebase 업데이트 완료');

      // 로컬 상태 업데이트
      setProducts(updatedProducts as Product[]);
      setSelectedProducts([]);
      
      // 쿠폰 할인 상태 업데이트
      setCoupon1Discount(updatedCoupon1Discount);
      setCoupon2Discount(updatedCoupon2Discount);
      setCoupon3Discount(updatedCoupon3Discount);
      
      console.log('[초기화] 로컬 상태 업데이트 완료');

      toast({
        description: <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" /> 
          선택한 상품의 할인 정보가 초기화되었습니다.
        </div>
      });
    } catch (error) {
      console.error('[초기화] 실패:', error);
      toast({
        description: <div className="flex items-center gap-2">
          <CircleAlert className="h-5 w-5" /> 
          할인 정보 초기화에 실패했습니다.
        </div>,
        variant: "destructive"
      });
    }
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
  useAutoSave({
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
    selectedChannelInfo: selectedChannelInfo || undefined,
    //immediateDiscount: selectedProducts.length > 0 ? {
    //  discountType: discountType || 'amount',
    //  discountValue: discountValue || 0,
    //  unitType: discountUnit || '%',
    //  appliedProducts: selectedProducts,
    //  updatedAt: new Date().toISOString()
    //} : null,
    coupon1Discount: selectedProducts.length > 0 ? selectedProducts.map(productId => {
      const product = products.find(p => p.product_id === productId);
      if (!product || product.coupon_price_1 === undefined) return null;
      return {
        product_id: productId,
        hurdleTarget: 'discount_price',
        hurdleAmount: 0,
        discountBase: 'discount_price',
        discountType: 'amount' as const,
        discountValue: Number(product.discount_price) - Number(product.coupon_price_1),
        roundUnit: 'none',
        roundType: 'ceil' as const,
        discountCap: 0,
        selfRatio: 0,
        decimalPoint: 'none' as const
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null) : undefined,
    coupon2Discount: selectedProducts.length > 0 ? selectedProducts.map(productId => {
      const product = products.find(p => p.product_id === productId);
      if (!product || product.coupon_price_2 === undefined) return null;
      return {
        product_id: productId,
        hurdleTarget: 'coupon_price_1',
        hurdleAmount: 0,
        discountBase: 'coupon_price_1',
        discountType: 'amount' as const,
        discountValue: Number(product.coupon_price_1) - Number(product.coupon_price_2),
        roundUnit: 'none',
        roundType: 'ceil' as const,
        discountCap: 0,
        selfRatio: 0,
        decimalPoint: 'none' as const
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null) : undefined,
    coupon3Discount: selectedProducts.length > 0 ? selectedProducts.map(productId => {
      const product = products.find(p => p.product_id === productId);
      if (!product || product.coupon_price_3 === undefined) return null;
      return {
        product_id: productId,
        hurdleTarget: 'coupon_price_2',
        hurdleAmount: 0,
        discountBase: 'coupon_price_2',
        discountType: 'amount' as const,
        discountValue: Number(product.coupon_price_2) - Number(product.coupon_price_3),
        roundUnit: 'none',
        roundType: 'ceil' as const,
        discountCap: 0,
        selfRatio: 0,
        decimalPoint: 'none' as const
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null) : undefined
  });

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

  // 사용자 인증 상태 감지
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUser({
          uid: user.uid,
          email: user.email || undefined
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Firebase에서 데이터 복원
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        console.log('=== Firebase 데이터 로드 시작 ===');
        if (!user) {
          console.log('사용자 정보 없음 - 인증 필요');
          return;
        }
    
        const docRef = doc(db, 'userCarts', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log('Firebase에서 가져온 전체 데이터:', data);
          
          // 1. 채널 정보 복원
          if (data.selectedChannelInfo) {
            console.log('채널 정보 복원:', data.selectedChannelInfo);
            setSelectedChannelInfo(data.selectedChannelInfo);
            setSelectedChannel(data.selectedChannelInfo.channel_name_2);
            setChannelSearchTerm(data.selectedChannelInfo.channel_name_2);
            setFilters(prev => ({ ...prev, channel_name_2: data.selectedChannelInfo.channel_name_2 }));
          }
          
          // 2. 상품 데이터 복원 - 기본 데이터만 먼저 설정
          if (data.products) {
            console.log('상품 데이터 복원:', data.products.length);
            
            // 쿠폰 가격 필드를 명시적으로 null로 설정
            const cleanProducts = data.products.map((product: Product) => ({
              ...product,
              coupon_price_1: null,
              coupon_price_2: null,
              coupon_price_3: null
            }));
            
            setProducts(cleanProducts);
          }
    
          // 로컬 상태에 쿠폰 할인 정보 업데이트
          if (data.coupon1Discount) {
            setCoupon1Discount(data.coupon1Discount);
          }
          if (data.coupon2Discount) {
            setCoupon2Discount(data.coupon2Discount);
          }
          if (data.coupon3Discount) {
            setCoupon3Discount(data.coupon3Discount);
          }
          
          // 3. 쿠폰 정보가 있는 경우에만 쿠폰 가격 계산 및 적용
          if (data.products && (data.coupon1Discount || data.coupon2Discount || data.coupon3Discount)) {
            const cleanProducts = [...data.products];
            
            // 쿠폰 정보가 있는 제품만 업데이트
            if (data.coupon1Discount && data.coupon1Discount.length > 0) {
              console.log('쿠폰1 정보 복원:', {
                count: data.coupon1Discount.length,
                appliedProducts: data.coupon1Discount.map((c: CouponDiscount) => c.product_id)
              });
              
              // 쿠폰1이 적용된 제품만 업데이트
              cleanProducts.forEach((product, index) => {
                const coupon1 = data.coupon1Discount.find((c: CouponDiscount) => c.product_id === product.product_id);
                if (coupon1) {
                  const basePrice = coupon1.discountBase === 'pricing_price' ? product.pricing_price :
                                 coupon1.discountBase === 'discount_price' ? product.discount_price :
                                 product.pricing_price;
                  
                  const calculatedPrice = calculateDiscount(
                    basePrice,
                    coupon1.discountValue,
                    coupon1.roundType,
                    coupon1.roundUnit,
                    data.selectedChannelInfo
                  );
                  
                  cleanProducts[index].coupon_price_1 = calculatedPrice;
                }
              });
            }
            
            if (data.coupon2Discount && data.coupon2Discount.length > 0) {
              console.log('쿠폰2 정보 복원:', {
                count: data.coupon2Discount.length,
                appliedProducts: data.coupon2Discount.map((c: CouponDiscount) => c.product_id)
              });
              
              // 쿠폰2가 적용된 제품만 업데이트
              cleanProducts.forEach((product, index) => {
                const coupon2 = data.coupon2Discount.find((c: CouponDiscount) => c.product_id === product.product_id);
                if (coupon2) {
                  const basePrice = coupon2.discountBase === 'pricing_price' ? product.pricing_price :
                                 coupon2.discountBase === 'discount_price' ? product.discount_price :
                                 coupon2.discountBase === 'coupon_price_1' ? (product.coupon_price_1 || product.discount_price) :
                                 product.pricing_price;
                  
                  const calculatedPrice = calculateDiscount(
                    basePrice,
                    coupon2.discountValue,
                    coupon2.roundType,
                    coupon2.roundUnit,
                    data.selectedChannelInfo
                  );
                  
                  cleanProducts[index].coupon_price_2 = calculatedPrice;
                }
              });
            }
            
            if (data.coupon3Discount && data.coupon3Discount.length > 0) {
              console.log('쿠폰3 정보 복원:', {
                count: data.coupon3Discount.length,
                appliedProducts: data.coupon3Discount.map((c: CouponDiscount) => c.product_id)
              });
              
              // 쿠폰3이 적용된 제품만 업데이트
              cleanProducts.forEach((product, index) => {
                const coupon3 = data.coupon3Discount.find((c: CouponDiscount) => c.product_id === product.product_id);
                if (coupon3) {
                  const basePrice = coupon3.discountBase === 'pricing_price' ? product.pricing_price :
                                 coupon3.discountBase === 'discount_price' ? product.discount_price :
                                 coupon3.discountBase === 'coupon_price_1' ? (product.coupon_price_1 || product.discount_price) :
                                 coupon3.discountBase === 'coupon_price_2' ? (product.coupon_price_2 || product.coupon_price_1 || product.discount_price) :
                                 product.pricing_price;
                  
                  const calculatedPrice = calculateDiscount(
                    basePrice,
                    coupon3.discountValue,
                    coupon3.roundType,
                    coupon3.roundUnit,
                    data.selectedChannelInfo
                  );
                  
                  cleanProducts[index].coupon_price_3 = calculatedPrice;
                }
              });
            }
            
            // 모든 쿠폰 할인 적용 후 상태 업데이트
            setProducts(cleanProducts);
          }
        }
      } catch (error) {
        console.error('데이터 복원 중 오류 발생:', error);
      }
    };

    if (user) {
      loadSavedData();
    }
  }, [user]);

  return (
    <ToastProvider>
      <div className="container mx-auto py-4"> 
        
        {/* 편집 섹션 */}
        <Card className="mb-6 py-5 px-5 bg-card rounded-lg shadow-sm">
          <CardContent className="p-0">
            <div className="flex flex-col gap-6">
              <div className="text-sm text-gray-500">
                <span className="mr-4">UUID : {listUuid}</span>
                <span className="mr-4">작성자 : 
                {user?.uid === 'a8mwwycqhaZLIb9iOcshPbpAVrj2' ? '한재훈' :
                 user?.uid === 'MhMI2KxbxkPHIAJP0o4sPSZG35e2' ? '이세명' :
                 user?.uid === '6DnflkbFSifLCNVQGWGv7aqJ2w72' ? '박연수' : 
                 user?.uid === 'XXiPzREDqeYEixyYZ0WKhhmlB5j1' ? '정가분' : 
                 user?.uid === 'NGqyl33oZHWB1lLmOLAK5DsRy5p1' ? '장아람' : 
                 user?.uid === 'f5zfSKJkMGZoVtEWrvICx1ELfRv2' ? '박경선' : 
                 ''}</span>
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
                            "w-[300px] justify-start text-center font-normal",
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
                  disabled={selectedProducts.length === 0}
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
            onApplyDiscount={handleImmediateDiscountApply}
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