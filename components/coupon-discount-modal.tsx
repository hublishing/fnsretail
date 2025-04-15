import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useState } from "react"
import { Product, ChannelInfo } from '@/app/types/cart'
import { calculateDiscount } from '@/app/utils/calculations/common'
import { useToast } from "@/components/ui/use-toast"
import { Check, CheckCircle2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"

// 숫자 포맷팅 유틸리티 함수 추가
const formatNumber = (value: number | string): string => {
  return Number(value).toLocaleString('ko-KR');
};

const parseNumber = (value: string): number => {
  return Number(value.replace(/,/g, ''));
};

type DiscountType = 'amount' | 'rate'

export interface TabState {
  hurdleTarget: string
  hurdleAmount: number
  discountBase: string
  discountType: DiscountType
  discountValue: number
  selfRatio: number
  roundType: 'floor' | 'ceil' | 'round'
  discountCap: number
  discountCapType: 'max' | 'fixed'
  decimalPoint: '0.01' | '0.1' | '1' | 'none'
  isDoubleCoupon: boolean
  secondCoupon: {
    hurdleTarget: string
    hurdleAmount: number
    discountBase: string
    discountType: DiscountType
    discountValue: number
    selfRatio: number
    roundType: 'floor' | 'ceil' | 'round'
    discountCap: number
    discountCapType: 'max' | 'fixed'
  decimalPoint: '0.01' | '0.1' | '1' | 'none'
  }
}

interface DiscountModalProps {
  showDiscountModal: boolean
  setShowDiscountModal: (show: boolean) => void
  onApplyDiscount: (products: Product[]) => void
  products: Product[]
  selectedProducts: string[]
  onClose: () => void
  calculateExpectedSettlementAmount: (product: Product) => number
  calculateExpectedNetProfit: (product: Product) => number
  calculateExpectedCommissionFee: (product: Product, adjustByDiscount?: boolean) => number
  selectedChannelInfo: ChannelInfo | null
  currentProducts: Product[]
}

export function DiscountModal({ 
  showDiscountModal, 
  setShowDiscountModal,
  onApplyDiscount,
  products,
  selectedProducts,
  onClose,
  calculateExpectedSettlementAmount,
  calculateExpectedNetProfit,
  calculateExpectedCommissionFee,
  selectedChannelInfo,
  currentProducts
}: DiscountModalProps) {
  const { toast } = useToast();
  const [currentTab, setCurrentTab] = useState('tab1')
  const [tabStates, setTabStates] = useState<Record<string, TabState>>({
    tab1: {
      hurdleTarget: 'discount_price',
      hurdleAmount: 0,
      discountBase: 'discount_price',
      discountType: 'amount',
      discountValue: 0,
      selfRatio: 0,
      roundType: 'ceil',
      discountCap: 0,
      discountCapType: 'max',
      decimalPoint: 'none',
      isDoubleCoupon: false,
      secondCoupon: {
        hurdleTarget: 'discount_price',
        hurdleAmount: 0,
        discountBase: 'discount_price',
        discountType: 'amount',
        discountValue: 0,
        selfRatio: 0,
        roundType: 'ceil',
        discountCap: 0,
        discountCapType: 'max',
      decimalPoint: 'none'
      }
    },
    tab2: {
      hurdleTarget: 'coupon_price_1',
      hurdleAmount: 0,
      discountBase: 'coupon_price_1',
      discountType: 'amount',
      discountValue: 0,
      selfRatio: 0,
      roundType: 'ceil',
      discountCap: 0,
      discountCapType: 'max',
      decimalPoint: 'none',
      isDoubleCoupon: false,
      secondCoupon: {
        hurdleTarget: 'discount_price',
        hurdleAmount: 0,
        discountBase: 'discount_price',
        discountType: 'amount',
        discountValue: 0,
        selfRatio: 0,
        roundType: 'ceil',
        discountCap: 0,
        discountCapType: 'max',
      decimalPoint: 'none'
      }
    },
    tab3: {
      hurdleTarget: 'coupon_price_2',
      hurdleAmount: 0,
      discountBase: 'coupon_price_2',
      discountType: 'amount',
      discountValue: 0,
      selfRatio: 0,
      roundType: 'ceil',
      discountCap: 0,
      discountCapType: 'max',
      decimalPoint: 'none',
      isDoubleCoupon: false,
      secondCoupon: {
        hurdleTarget: 'discount_price',
        hurdleAmount: 0,
        discountBase: 'discount_price',
        discountType: 'amount',
        discountValue: 0,
        selfRatio: 0,
        roundType: 'ceil',
        discountCap: 0,
        discountCapType: 'max',
      decimalPoint: 'none'
      }
    }
  })

  const handleTabChange = (value: string) => {
    setCurrentTab(value)
  }

  const getCurrentTabState = () => {
    return tabStates[currentTab]
  }

  const handleTabStateChange = (tab: string, field: keyof TabState, value: any) => {
    setTabStates(prev => ({
      ...prev,
      [tab]: {
        ...prev[tab],
        [field]: value
      }
    }))
  }

  // 숫자 입력 핸들러 추가
  const handleNumberChange = (tab: string, field: keyof TabState, value: string) => {
    const parsedValue = parseNumber(value);
    handleTabStateChange(tab, field, parsedValue);
  };

  const handleApplyDiscount = async (type: 'coupon1' | 'coupon2' | 'coupon3', state: TabState) => {
    try {
      console.log('=== handleApplyDiscount 시작 ===');
      console.log('입력 파라미터:', {
        type,
        state,
        selectedProducts,
        currentProductsLength: currentProducts.length
      });

      if (!selectedProducts.length) {
        console.log('선택된 상품이 없음');
        return;
      }

      const updatedProducts = currentProducts.map(product => {
        if (selectedProducts.includes(product.product_id)) {
          console.log('상품 처리 시작:', {
            product_id: product.product_id,
            basePrice: product[state.discountBase as keyof Product],
            discountType: state.discountType,
            discountValue: state.discountValue
          });

          const basePrice = Number(product[state.discountBase as keyof Product]) || 0;
          // 기준금액 체크 추가
          if (basePrice < state.hurdleAmount) {
            // 기준금액보다 작으면 할인 적용하지 않고 원래 상품 반환
            return product;
          }
          
          let newPrice = basePrice;
          
          // 이중쿠폰이 활성화된 경우
          if (state.isDoubleCoupon) {
            console.log('이중쿠폰 처리 시작');
            const firstBasePrice = Number(product[state.discountBase as keyof Product]) || 0;
            const secondBasePrice = Number(product[state.secondCoupon.discountBase as keyof Product]) || 0;
            
            console.log('이중쿠폰 기준가격:', {
              firstBasePrice,
              secondBasePrice,
              hurdleAmount: state.hurdleAmount,
              secondHurdleAmount: state.secondCoupon.hurdleAmount
            });
            
            // 첫 번째 쿠폰의 기준금액 범위 체크
            if (firstBasePrice >= state.hurdleAmount && firstBasePrice < state.secondCoupon.hurdleAmount) {
              console.log('첫 번째 쿠폰 적용');
          if (state.discountType === 'rate') {
                const calculatedDiscount = calculateDiscount(firstBasePrice, state.discountValue, state.roundType, state.decimalPoint);
                const discountAmount = firstBasePrice - calculatedDiscount;
                
                console.log('첫 번째 쿠폰 할인 계산:', {
                  calculatedDiscount,
                  discountAmount,
                  discountCapType: state.discountCapType,
                  discountCap: state.discountCap
                });
                
                if (state.discountCapType === 'max') {
                  if (state.discountCap === 0) {
                    newPrice = calculatedDiscount;
                  } else {
                    newPrice = Math.max(firstBasePrice - state.discountCap, calculatedDiscount);
                  }
                } else {
                  if (discountAmount > state.discountCap) {
                    newPrice = calculatedDiscount;
                  } else {
                    newPrice = firstBasePrice - state.discountCap;
                  }
                }
              } else {
                newPrice = firstBasePrice - state.discountValue;
              }
            }
            // 두 번째 쿠폰의 기준금액 범위 체크
            else if (secondBasePrice >= state.secondCoupon.hurdleAmount) {
              console.log('두 번째 쿠폰 적용');
              if (state.secondCoupon.discountType === 'rate') {
                const secondCalculatedDiscount = calculateDiscount(secondBasePrice, state.secondCoupon.discountValue, state.secondCoupon.roundType, state.secondCoupon.decimalPoint);
                const secondDiscountAmount = secondBasePrice - secondCalculatedDiscount;
                
                console.log('두 번째 쿠폰 할인 계산:', {
                  secondCalculatedDiscount,
                  secondDiscountAmount,
                  discountCapType: state.secondCoupon.discountCapType,
                  discountCap: state.secondCoupon.discountCap
                });
                
                if (state.secondCoupon.discountCapType === 'max') {
                  newPrice = Math.max(secondBasePrice - state.secondCoupon.discountCap, secondCalculatedDiscount);
                } else {
                  if (secondDiscountAmount > state.secondCoupon.discountCap) {
                    newPrice = secondCalculatedDiscount;
                  } else {
                    newPrice = secondBasePrice - state.secondCoupon.discountCap;
                  }
                }
              } else {
                newPrice = secondBasePrice - state.secondCoupon.discountValue;
              }
            }
          } else {
            // 단일 쿠폰 적용
            console.log('단일 쿠폰 처리 시작');
            if (state.discountType === 'rate') {
              const calculatedDiscount = calculateDiscount(basePrice, state.discountValue, state.roundType, state.decimalPoint);
              const discountAmount = basePrice - calculatedDiscount;
              
              console.log('단일 쿠폰 할인 계산:', {
                calculatedDiscount,
                discountAmount,
                discountCapType: state.discountCapType,
                discountCap: state.discountCap
              });
              
              if (state.discountCapType === 'max') {
                if (state.discountCap === 0) {
                  newPrice = calculatedDiscount;
                } else {
                  newPrice = Math.max(basePrice - state.discountCap, calculatedDiscount);
                }
              } else {
                if (discountAmount > state.discountCap) {
                  newPrice = calculatedDiscount;
                } else {
                  newPrice = basePrice - state.discountCap;
                }
              }
          } else {
            newPrice = basePrice - state.discountValue;
            }
          }
          
          console.log('최종 가격 계산:', {
            originalPrice: basePrice,
            newPrice,
            discountAmount: basePrice - newPrice
          });
          
          const updatedProduct = { ...product };
          switch (type) {
            case 'coupon1':
              updatedProduct.coupon_price_1 = newPrice;
              updatedProduct.coupon_price_2 = updatedProduct.coupon_price_2 ?? null;
              updatedProduct.coupon_price_3 = updatedProduct.coupon_price_3 ?? null;
              break;
            case 'coupon2':
              updatedProduct.coupon_price_1 = updatedProduct.coupon_price_1 ?? null;
              updatedProduct.coupon_price_2 = newPrice;
              updatedProduct.coupon_price_3 = updatedProduct.coupon_price_3 ?? null;
              break;
            case 'coupon3':
              updatedProduct.coupon_price_1 = updatedProduct.coupon_price_1 ?? null;
              updatedProduct.coupon_price_2 = updatedProduct.coupon_price_2 ?? null;
              updatedProduct.coupon_price_3 = newPrice;
              break;
          }

          // 각 쿠폰별 할인금액 계산
          const discountAmount1 = updatedProduct.coupon_price_1 ? 
            Number(product[state.discountBase as keyof Product]) - updatedProduct.coupon_price_1 : 0;
          const discountAmount2 = updatedProduct.coupon_price_2 ? 
            Number(product[state.discountBase as keyof Product]) - updatedProduct.coupon_price_2 : 0;
          const discountAmount3 = updatedProduct.coupon_price_3 ? 
            Number(product[state.discountBase as keyof Product]) - updatedProduct.coupon_price_3 : 0;
          
          console.log('쿠폰별 할인금액:', {
            discountAmount1,
            discountAmount2,
            discountAmount3
          });
          
          // 쿠폰별 자사부담액 계산 및 저장
          const prevSelfBurden1 = product.self_burden_1 || 0;
          const prevSelfBurden2 = product.self_burden_2 || 0;
          const prevSelfBurden3 = product.self_burden_3 || 0;
          
          let selfBurden1 = prevSelfBurden1;
          let selfBurden2 = prevSelfBurden2;
          let selfBurden3 = prevSelfBurden3;
          
          switch (type) {
            case 'coupon1':
              selfBurden1 = Math.floor(discountAmount1 * (state.selfRatio / 100));
              break;
            case 'coupon2':
              selfBurden2 = Math.floor(discountAmount2 * (state.selfRatio / 100));
              break;
            case 'coupon3':
              selfBurden3 = Math.floor(discountAmount3 * (state.selfRatio / 100));
              break;
          }
          
          console.log('자사부담액 계산:', {
            prevSelfBurden1,
            prevSelfBurden2,
            prevSelfBurden3,
            newSelfBurden1: selfBurden1,
            newSelfBurden2: selfBurden2,
            newSelfBurden3: selfBurden3,
            selfRatio: state.selfRatio
          });
          
          updatedProduct.self_burden_1 = selfBurden1;
          updatedProduct.self_burden_2 = selfBurden2;
          updatedProduct.self_burden_3 = selfBurden3;
          
          const totalBurdenAmount = selfBurden1 + selfBurden2 + selfBurden3;
          updatedProduct.discount_burden_amount = totalBurdenAmount;

          // 예상수수료, 정산예정금액, 예상순이익 재계산
          updatedProduct.expected_settlement_amount = calculateExpectedSettlementAmount(updatedProduct);
          updatedProduct.expected_net_profit = calculateExpectedNetProfit(updatedProduct);
          updatedProduct.expected_commission_fee = calculateExpectedCommissionFee(updatedProduct);

          console.log('상품 업데이트 완료:', {
            product_id: updatedProduct.product_id,
            coupon_price_1: updatedProduct.coupon_price_1,
            coupon_price_2: updatedProduct.coupon_price_2,
            coupon_price_3: updatedProduct.coupon_price_3,
            self_burden_1: updatedProduct.self_burden_1,
            self_burden_2: updatedProduct.self_burden_2,
            self_burden_3: updatedProduct.self_burden_3,
            discount_burden_amount: updatedProduct.discount_burden_amount,
            expected_settlement_amount: updatedProduct.expected_settlement_amount,
            expected_net_profit: updatedProduct.expected_net_profit,
            expected_commission_fee: updatedProduct.expected_commission_fee
          });

          return updatedProduct;
        }
        return product;
      });

      console.log('=== handleApplyDiscount 완료 ===');
      console.log('업데이트된 상품 목록:', updatedProducts);
      
      onApplyDiscount(updatedProducts);
      setShowDiscountModal(false);
      toast({
        description: <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5" /> 할인이 적용되었습니다.</div>,
      });
    } catch (error) {
      console.error('할인 적용 중 오류:', error);
      toast({
        variant: "destructive",
        description: "할인 적용 중 오류가 발생했습니다.",
      });
    }
  };

  return (
    <Dialog open={showDiscountModal} onOpenChange={setShowDiscountModal}>
      <DialogContent className="sm:max-w-[600px] bg-background">
        <DialogHeader>
          <DialogTitle>쿠폰 할인 적용</DialogTitle>
          <DialogDescription>
            선택한 상품에 쿠폰 할인을 적용합니다.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Tabs defaultValue="tab1" className="w-full" onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="tab1">쿠폰1</TabsTrigger>
              <TabsTrigger value="tab2">쿠폰2</TabsTrigger>
              <TabsTrigger value="tab3">쿠폰3</TabsTrigger>
            </TabsList>

            {/* ===== 쿠폰1 탭 시작 ===== */}
            <TabsContent value="tab1">
              <div className="grid gap-4 py-4">
                
                {/* 할인 적용 기준금액 및 할인 구분 */}
                <div className="grid grid-cols-3 gap-4 pb-4">
                  <div className="flex flex-col gap-2">  
                    <Label className="w-full text-muted-foreground">할인타입</Label>
                    <div className="flex gap-1">
                      <Button
                        variant={getCurrentTabState().discountType === 'amount' ? 'default' : 'outline'}
                        className={`h-8 rounded-full flex items-center justify-center gap-1.5 font-bold ${
                          getCurrentTabState().discountType === 'amount' 
                          ? 'border border-blue-500 bg-blue-50 text-blue-500 hover:bg-blue-100 pl-2 pr-3' 
                          : 'bg-transparent text-gray-500 border-gray-200 px-3'
                        }`}
                        onClick={() => handleTabStateChange('tab1', 'discountType', 'amount')}
                      >
                        {getCurrentTabState().discountType === 'amount' && (
                          <Check className="h-4 w-4 text-blue-500 shrink-0" />
                        )}
                        <span>원</span>
                      </Button>
                      <Button
                        variant={getCurrentTabState().discountType === 'rate' ? 'default' : 'outline'}
                        className={`h-8 rounded-full flex items-center justify-center gap-1.5 font-bold ${
                          getCurrentTabState().discountType === 'rate' 
                          ? 'border border-blue-500 bg-blue-50 text-blue-500 hover:bg-blue-100 pl-2 pr-3' 
                          : 'bg-transparent text-gray-500 border-gray-200 px-3'
                        }`}
                        onClick={() => handleTabStateChange('tab1', 'discountType', 'rate')}
                      >
                        {getCurrentTabState().discountType === 'rate' && (
                          <Check className="h-4 w-4 text-blue-500 shrink-0" />
                        )}
                        <span>%</span>
                      </Button>
                    </div>
                  </div>
                  
                  {getCurrentTabState().discountType === 'rate' && (
                  <div className="flex flex-col gap-2">      
                    <Label className="w-full text-muted-foreground">할인금액</Label>
                    <div className="flex gap-1"> 
                      <Button
                        variant={getCurrentTabState().discountCapType === 'max' ? 'default' : 'outline'}
                        className={`h-8 rounded-full flex items-center justify-center gap-1.5 font-bold ${
                          getCurrentTabState().discountCapType === 'max' 
                          ? 'border border-blue-500 bg-blue-50 text-blue-500 hover:bg-blue-100 pl-2 pr-3' 
                          : 'bg-transparent text-gray-500 border-gray-200 px-3'
                        }`}
                        onClick={() => handleTabStateChange('tab1', 'discountCapType', 'max')}
                      >
                        {getCurrentTabState().discountCapType === 'max' && (
                          <Check className="h-4 w-4 text-blue-500 shrink-0" />
                        )}
                        <span>최대</span>
                      </Button>
                      <Button
                        variant={getCurrentTabState().discountCapType === 'fixed' ? 'default' : 'outline'}
                        className={`h-8 rounded-full flex items-center justify-center gap-1.5 font-bold ${
                          getCurrentTabState().discountCapType === 'fixed' 
                          ? 'border border-blue-500 bg-blue-50 text-blue-500 hover:bg-blue-100 pl-2 pr-3' 
                          : 'bg-transparent text-gray-500 border-gray-200 px-3'
                        }`}
                        onClick={() => handleTabStateChange('tab1', 'discountCapType', 'fixed')}
                      >
                        {getCurrentTabState().discountCapType === 'fixed' && (
                          <Check className="h-4 w-4 text-blue-500 shrink-0" />
                        )}
                        <span>고정</span>
                      </Button>
                    </div>
                  </div>      
                  )}
                  
                  {/* 할인율 입력 필드 */}
                  {getCurrentTabState().discountType === 'rate' && (
                    <>
                      {/* 이중쿠폰 스위치 */}
                      <div className="flex flex-col gap-2">  
                        <Label className="w-full text-muted-foreground">이중쿠폰</Label>
                <div className="flex items-center gap-2"> 
                          <Switch
                            checked={getCurrentTabState().isDoubleCoupon}
                            onCheckedChange={(checked) => handleTabStateChange('tab1', 'isDoubleCoupon', checked)}
                          />
                        </div>
                      </div>
                    </>
                    )}
                </div>

                {/* 사용가능 기준금액 */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label className="w-full text-muted-foreground">사용가능 기준금액</Label>
                  <Select
                    value={getCurrentTabState().hurdleTarget}
                    onValueChange={(value: string) => handleTabStateChange('tab1', 'hurdleTarget', value)}
                  >
                      <SelectTrigger className="w-full h-10">
                      <SelectValue placeholder="기준금액 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pricing_price">채널별판매가</SelectItem>
                      <SelectItem value="discount_price">즉시할인가</SelectItem>
                      <SelectItem value="coupon_price_1">쿠폰적용가1</SelectItem>
                      <SelectItem value="coupon_price_2">쿠폰적용가2</SelectItem>
                      <SelectItem value="coupon_price_3">쿠폰적용가3</SelectItem>
                    </SelectContent>
                  </Select> 
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label className="w-full text-muted-foreground">기준금액 (원 이상)</Label>
                    <div className="relative">
                  <Input
                        type="text"
                        value={formatNumber(getCurrentTabState().hurdleAmount)}
                        onChange={(e) => handleNumberChange('tab1', 'hurdleAmount', e.target.value)}
                        className="w-full h-10"
                    placeholder="예: 50000"
                  />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">원</span>
                </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label className="w-full text-muted-foreground">할인적용 기준금액</Label>
                  <Select
                    value={getCurrentTabState().discountBase}
                    onValueChange={(value: string) => handleTabStateChange('tab1', 'discountBase', value)}
                  >
                      <SelectTrigger className="w-full h-10">
                      <SelectValue placeholder="기준금액 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pricing_price">채널별판매가</SelectItem>
                      <SelectItem value="discount_price">즉시할인가</SelectItem>
                      <SelectItem value="coupon_price_1">쿠폰적용가1</SelectItem>
                      <SelectItem value="coupon_price_2">쿠폰적용가2</SelectItem>
                      <SelectItem value="coupon_price_3">쿠폰적용가3</SelectItem>
                    </SelectContent>
                  </Select> 
                  </div>
                </div>

                  {/* 할인금액 입력 필드 */}
                  {getCurrentTabState().discountType === 'amount' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2"> 
                      <Label className="w-full text-muted-foreground">할인금액</Label>
                      <div className="relative">
                      <Input
                          type="text"
                          value={formatNumber(getCurrentTabState().discountValue)}
                          onChange={(e) => handleNumberChange('tab1', 'discountValue', e.target.value)}
                          className="w-full h-10"
                        placeholder="할인금액 입력"
                      />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">원</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label className="w-full text-muted-foreground">자사부담</Label>
                      <div className="relative">
                        <Input
                          type="text"
                          value={formatNumber(getCurrentTabState().selfRatio)}
                          onChange={(e) => handleNumberChange('tab1', 'selfRatio', e.target.value)}
                          className="w-full h-10"
                          placeholder="%"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                    </div>
                  )}

                  {/* 할인율 입력 필드 */}
                  {getCurrentTabState().discountType === 'rate' && (
                    <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <Label className="w-full text-muted-foreground">할인율</Label>
                        <div className="relative">
                        <Input
                            type="text"
                            value={formatNumber(getCurrentTabState().discountValue)}
                            onChange={(e) => handleNumberChange('tab1', 'discountValue', e.target.value)}
                          className="w-full h-10"
                          placeholder="할인율 입력"
                        />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                      </div>
                      </div>
                  {getCurrentTabState().discountType === 'rate' && (
                    <>
                        <div className="flex flex-col gap-2">
                          <Label className="w-full text-muted-foreground">소수점</Label>
                          <div className="flex gap-2">
                            <Select
                              value={getCurrentTabState().decimalPoint}
                              onValueChange={(value: '0.01' | '0.1' | '1' | 'none') => handleTabStateChange('tab1', 'decimalPoint', value)}
                            >
                            <SelectTrigger className="w-full h-10">
                                <SelectValue placeholder="소수점" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">소수점</SelectItem>
                                <SelectItem value="0.01">0.01</SelectItem>
                                <SelectItem value="0.1">0.1</SelectItem>
                                <SelectItem value="1">1</SelectItem>
                              </SelectContent>
                            </Select> 
                            {getCurrentTabState().decimalPoint !== 'none' && (
                              <Select
                                value={getCurrentTabState().roundType}
                                onValueChange={(value: 'floor' | 'ceil' | 'round') => handleTabStateChange('tab1', 'roundType', value)}
                              >
                              <SelectTrigger className="w-full h-10">
                                  <SelectValue placeholder="반올림" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="ceil">올림</SelectItem>
                                  <SelectItem value="floor">내림</SelectItem>
                                  <SelectItem value="round">반올림</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                      </div>
                          </div>
                          </>
                        )}
                      </div>

                    <div className="grid grid-cols-2 gap-4"> 
                      <div className="flex flex-col gap-2">
                        <div className="relative">
                          <Label className="w-full text-muted-foreground">
                            {getCurrentTabState().discountCapType === 'max' ? '최대할인금액' : '고정할인금액'}
                          </Label>
                          <div className="relative">
                            <Input
                              type="text"
                              value={formatNumber(getCurrentTabState().discountCap)}
                              onChange={(e) => handleNumberChange('tab1', 'discountCap', e.target.value)}
                              className="w-full h-10"
                              placeholder="할인금액"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">원</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label className="w-full text-muted-foreground">자사부담</Label>
                        <div className="relative">
                          <Input
                          type="text"
                          value={formatNumber(getCurrentTabState().selfRatio)}
                          onChange={(e) => handleNumberChange('tab1', 'selfRatio', e.target.value)}
                          className="w-full h-10"
                          placeholder="%"
                        />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                        </div>
                      </div> 
                    </div>

                    {/* 두 번째 쿠폰 입력창 */}
                    {getCurrentTabState().isDoubleCoupon && (
                      <>
                      <div className="border-t pt-4 mt-4"></div>
                      <div className="grid grid-cols-3 gap-4 pb-4"> 
                        <div className="flex flex-col gap-2">
                          <Label className="w-full text-muted-foreground">할인 구분</Label>
                          <div className="flex gap-1">
                            <Button
                              variant={getCurrentTabState().secondCoupon.discountType === 'amount' ? 'default' : 'outline'}
                              className={`h-8 rounded-full flex items-center justify-center gap-1.5 font-bold ${
                                getCurrentTabState().secondCoupon.discountType === 'amount' 
                                ? 'border border-blue-500 bg-blue-50 text-blue-500 hover:bg-blue-100 pl-2 pr-3' 
                                : 'bg-transparent text-gray-500 border-gray-200 px-3'
                              }`}
                              onClick={() => handleTabStateChange('tab1', 'secondCoupon', {
                                ...getCurrentTabState().secondCoupon,
                                discountType: 'amount'
                              })}
                            >
                              {getCurrentTabState().secondCoupon.discountType === 'amount' && (
                                <Check className="h-4 w-4 text-blue-500 shrink-0" />
                              )}
                              <span>원</span>
                            </Button>
                            <Button
                              variant={getCurrentTabState().secondCoupon.discountType === 'rate' ? 'default' : 'outline'}
                              className={`h-8 rounded-full flex items-center justify-center gap-1.5 font-bold ${
                                getCurrentTabState().secondCoupon.discountType === 'rate' 
                                ? 'border border-blue-500 bg-blue-50 text-blue-500 hover:bg-blue-100 pl-2 pr-3' 
                                : 'bg-transparent text-gray-500 border-gray-200 px-3'
                              }`}
                              onClick={() => handleTabStateChange('tab1', 'secondCoupon', {
                                ...getCurrentTabState().secondCoupon,
                                discountType: 'rate'
                              })}
                            >
                              {getCurrentTabState().secondCoupon.discountType === 'rate' && (
                                <Check className="h-4 w-4 text-blue-500 shrink-0" />
                              )}
                              <span>%</span>
                            </Button>
                          </div>
                </div>

                        {getCurrentTabState().secondCoupon.discountType === 'rate' && (
                        <div className="flex flex-col gap-2">      
                          <Label className="w-full text-muted-foreground">할인금액</Label>
                          <div className="flex gap-1"> 
                          <Button
                            variant="outline"
                            className={`h-8 rounded-full flex items-center justify-center gap-1.5 font-bold ${
                              getCurrentTabState().secondCoupon.discountCapType === 'max' 
                              ? 'border border-blue-500 bg-blue-50 text-blue-500 hover:bg-blue-100 pl-2 pr-3' 
                              : 'bg-transparent text-gray-500 border-gray-200 px-3'
                            }`}
                            onClick={() => handleTabStateChange('tab1', 'secondCoupon', {
                              ...getCurrentTabState().secondCoupon,
                              discountCapType: 'max'
                            })}
                          >
                            {getCurrentTabState().secondCoupon.discountCapType === 'max' && (
                              <Check className="h-4 w-4 text-blue-500 shrink-0" />
                            )}
                            <span>최대</span>
                          </Button>

                          <Button
                            variant="outline"
                            className={`h-8 rounded-full flex items-center justify-center gap-1.5 font-bold ${
                              getCurrentTabState().secondCoupon.discountCapType === 'fixed' 
                              ? 'border border-blue-500 bg-blue-50 text-blue-500 hover:bg-blue-100 pl-2 pr-3' 
                              : 'bg-transparent text-gray-500 border-gray-200 px-3'
                            }`}
                            onClick={() => handleTabStateChange('tab1', 'secondCoupon', {
                              ...getCurrentTabState().secondCoupon,
                              discountCapType: 'fixed'
                            })}
                          >
                            {getCurrentTabState().secondCoupon.discountCapType === 'fixed' && (
                              <Check className="h-4 w-4 text-blue-500 shrink-0" />
                            )}
                            <span>고정</span>
                          </Button>
                          </div>
                        </div>      
                        )}
                      </div>
                      
                          <div className="grid grid-cols-3 gap-4"> 
                            <div className="flex flex-col gap-2">
                            <Label className="w-full text-muted-foreground">사용가능 기준금액</Label>
                            <Select
                              value={getCurrentTabState().secondCoupon.hurdleTarget}
                              onValueChange={(value: string) => handleTabStateChange('tab1', 'secondCoupon', {
                                ...getCurrentTabState().secondCoupon,
                                hurdleTarget: value
                              })}
                            >
                              <SelectTrigger className="w-full h-10">
                                <SelectValue placeholder="기준금액 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pricing_price">채널별판매가</SelectItem>
                                <SelectItem value="discount_price">즉시할인가</SelectItem>
                                <SelectItem value="coupon_price_1">쿠폰적용가1</SelectItem>
                                <SelectItem value="coupon_price_2">쿠폰적용가2</SelectItem>
                                <SelectItem value="coupon_price_3">쿠폰적용가3</SelectItem>
                              </SelectContent>
                            </Select>
                            </div>

                            <div className="flex flex-col gap-2">
                              <Label className="w-full text-muted-foreground">기준금액 (원 이상)</Label>
                              <div className="relative">
                    <Input
                                  type="text"
                                  value={formatNumber(getCurrentTabState().secondCoupon.hurdleAmount)}
                                  onChange={(e) => handleTabStateChange('tab1', 'secondCoupon', {
                                    ...getCurrentTabState().secondCoupon,
                                    hurdleAmount: parseNumber(e.target.value)
                                  })}
                                  className="w-full h-10"
                                  placeholder="예: 50000"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">원</span>
                              </div>
                            </div>

                            <div className="flex flex-col gap-2"> 
                              <Label className="w-full text-muted-foreground">할인적용 기준금액</Label>
                              <Select
                                value={getCurrentTabState().secondCoupon.discountBase}
                                onValueChange={(value: string) => handleTabStateChange('tab1', 'secondCoupon', {
                                  ...getCurrentTabState().secondCoupon,
                                  discountBase: value
                                })}
                              >
                                <SelectTrigger className="w-full h-10">
                                  <SelectValue placeholder="기준금액 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pricing_price">채널별판매가</SelectItem>
                                  <SelectItem value="discount_price">즉시할인가</SelectItem>
                                  <SelectItem value="coupon_price_1">쿠폰적용가1</SelectItem>
                                  <SelectItem value="coupon_price_2">쿠폰적용가2</SelectItem>
                                  <SelectItem value="coupon_price_3">쿠폰적용가3</SelectItem>
                                </SelectContent>
                              </Select> 
                            </div>
                          </div>

                          

                          {/* 할인금액 입력 필드 */}
                          {getCurrentTabState().secondCoupon.discountType === 'amount' && (
                          <div className="grid grid-cols-2 gap-4"> 
                            <div className="flex flex-col gap-2">
                              <Label className="w-full text-muted-foreground">할인금액</Label>
                              <div className="relative">
                                <Input
                                  type="text"
                                  value={formatNumber(getCurrentTabState().secondCoupon.discountValue)}
                                  onChange={(e) => handleTabStateChange('tab1', 'secondCoupon', {
                                    ...getCurrentTabState().secondCoupon,
                                    discountValue: parseNumber(e.target.value)
                                  })}
                                  className="w-full h-10"
                                  placeholder="할인금액 입력"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">원</span>
                              </div>
                            </div>

                            <div className="flex flex-col gap-2">
                              <Label className="w-full text-muted-foreground">자사부담</Label>
                              <div className="relative">
                                  <Input
                                  type="text"
                                  value={formatNumber(getCurrentTabState().secondCoupon.selfRatio)}
                                  onChange={(e) => handleTabStateChange('tab1', 'secondCoupon', {
                                    ...getCurrentTabState().secondCoupon,
                                    selfRatio: parseNumber(e.target.value)
                                  })}
                                  className="w-full h-10"
                      placeholder="%"
                    />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                              </div>
                            </div>
                  </div>
                )}

                {/* 할인율 입력 필드 */}
                          {getCurrentTabState().secondCoupon.discountType === 'rate' && (
                            <>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2 mt-4">
                                  <Label className="w-full text-muted-foreground">할인율</Label>
                                  <div className="relative">
                        <Input
                                      type="text"
                                      value={formatNumber(getCurrentTabState().secondCoupon.discountValue)}
                                      onChange={(e) => handleTabStateChange('tab1', 'secondCoupon', {
                                        ...getCurrentTabState().secondCoupon,
                                        discountValue: parseNumber(e.target.value)
                                      })}
                                      className="w-full h-10"
                                      placeholder="할인율 입력"
                                    />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                                  </div>
                                </div>

                                <div className="flex flex-col gap-2 mt-4">
                                  <Label className="w-full text-muted-foreground">소수점</Label>
                                  <div className="flex gap-2">
                                  <Select
                                    value={getCurrentTabState().secondCoupon.decimalPoint}
                                    onValueChange={(value: '0.01' | '0.1' | '1' | 'none') => handleTabStateChange('tab1', 'secondCoupon', {
                                      ...getCurrentTabState().secondCoupon,
                                      decimalPoint: value
                                    })}
                                  >
                                    <SelectTrigger className="w-full h-10">
                                      <SelectValue placeholder="소수점" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">소수점</SelectItem>
                                      <SelectItem value="0.01">0.01</SelectItem>
                                      <SelectItem value="0.1">0.1</SelectItem>
                                      <SelectItem value="1">1</SelectItem>
                                    </SelectContent>
                                  </Select>

                                  {getCurrentTabState().secondCoupon.decimalPoint !== 'none' && (
                                    <Select
                                      value={getCurrentTabState().secondCoupon.roundType}
                                      onValueChange={(value: 'floor' | 'ceil' | 'round') => handleTabStateChange('tab1', 'secondCoupon', {
                                        ...getCurrentTabState().secondCoupon,
                                        roundType: value
                                      })}
                                    >
                                      <SelectTrigger className="w-full h-10">
                                        <SelectValue placeholder="반올림" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="ceil">올림</SelectItem>
                                        <SelectItem value="floor">내림</SelectItem>
                                        <SelectItem value="round">반올림</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                  <Label className="w-full text-muted-foreground">
                                  {getCurrentTabState().secondCoupon.discountCapType === 'max' ? '최대할인금액' : '고정할인금액'}
                                  </Label>
                                  <div className="relative">
                        <Input
                                      type="text"
                                      value={formatNumber(getCurrentTabState().secondCoupon.discountCap)}
                                      onChange={(e) => handleTabStateChange('tab1', 'secondCoupon', {
                                        ...getCurrentTabState().secondCoupon,
                                        discountCap: parseNumber(e.target.value)
                                      })}
                                      className="w-full h-10"
                                      placeholder="할인금액"
                                    />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">원</span>
                                  </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                  <Label className="w-full text-muted-foreground">자사부담</Label>
                                  <div className="relative">
                                    <Input
                                    type="text"
                                    value={formatNumber(getCurrentTabState().secondCoupon.selfRatio)}
                                    onChange={(e) => handleTabStateChange('tab1', 'secondCoupon', {
                                      ...getCurrentTabState().secondCoupon,
                                      selfRatio: parseNumber(e.target.value)
                                    })}
                                    className="w-full h-10"
                          placeholder="%"
                        />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                                  </div>
                                </div>
                      </div>
                            </>
                          )}
                      </>
                    )}
                    </>
                  )}
              </div> 
              <div className="mt-4 flex justify-end">
                <Button onClick={() => handleApplyDiscount('coupon1', getCurrentTabState())}>쿠폰1 적용</Button>
              </div>
            </TabsContent>
            {/* ===== 쿠폰1 탭 끝 ===== */}

            {/* ===== 쿠폰2 탭 시작 ===== */}
            <TabsContent value="tab2">
              <div className="grid gap-4 py-4">
                {/* 할인 적용 기준금액 및 할인 구분 */}
                <div className="grid grid-cols-3 gap-4 pb-4">
                  <div className="flex flex-col gap-2">  
                    <Label className="w-full text-muted-foreground">할인타입</Label>
                    <div className="flex gap-1">
                      <Button
                        variant={getCurrentTabState().discountType === 'amount' ? 'default' : 'outline'}
                        className={`h-8 rounded-full flex items-center justify-center gap-1.5 font-bold ${
                          getCurrentTabState().discountType === 'amount' 
                          ? 'border border-blue-500 bg-blue-50 text-blue-500 hover:bg-blue-100 pl-2 pr-3' 
                          : 'bg-transparent text-gray-500 border-gray-200 px-3'
                        }`}
                        onClick={() => handleTabStateChange('tab2', 'discountType', 'amount')}
                      >
                        {getCurrentTabState().discountType === 'amount' && (
                          <Check className="h-4 w-4 text-blue-500 shrink-0" />
                        )}
                        <span>원</span>
                      </Button>
                      <Button
                        variant={getCurrentTabState().discountType === 'rate' ? 'default' : 'outline'}
                        className={`h-8 rounded-full flex items-center justify-center gap-1.5 font-bold ${
                          getCurrentTabState().discountType === 'rate' 
                          ? 'border border-blue-500 bg-blue-50 text-blue-500 hover:bg-blue-100 pl-2 pr-3' 
                          : 'bg-transparent text-gray-500 border-gray-200 px-3'
                        }`}
                        onClick={() => handleTabStateChange('tab2', 'discountType', 'rate')}
                      >
                        {getCurrentTabState().discountType === 'rate' && (
                          <Check className="h-4 w-4 text-blue-500 shrink-0" />
                        )}
                        <span>%</span>
                      </Button>
                    </div>
                  </div>

                  {getCurrentTabState().discountType === 'rate' && (
                  <div className="flex flex-col gap-2">      
                    <Label className="w-full text-muted-foreground">할인금액</Label>
                    <div className="flex gap-1"> 
                      <Button
                        variant={getCurrentTabState().discountCapType === 'max' ? 'default' : 'outline'}
                        className={`h-8 rounded-full flex items-center justify-center gap-1.5 font-bold ${
                          getCurrentTabState().discountCapType === 'max' 
                          ? 'border border-blue-500 bg-blue-50 text-blue-500 hover:bg-blue-100 pl-2 pr-3' 
                          : 'bg-transparent text-gray-500 border-gray-200 px-3'
                        }`}
                        onClick={() => handleTabStateChange('tab2', 'discountCapType', 'max')}
                      >
                        {getCurrentTabState().discountCapType === 'max' && (
                          <Check className="h-4 w-4 text-blue-500 shrink-0" />
                        )}
                        <span>최대</span>
                      </Button>
                      <Button
                        variant={getCurrentTabState().discountCapType === 'fixed' ? 'default' : 'outline'}
                        className={`h-8 rounded-full flex items-center justify-center gap-1.5 font-bold ${
                          getCurrentTabState().discountCapType === 'fixed' 
                          ? 'border border-blue-500 bg-blue-50 text-blue-500 hover:bg-blue-100 pl-2 pr-3' 
                          : 'bg-transparent text-gray-500 border-gray-200 px-3'
                        }`}
                        onClick={() => handleTabStateChange('tab2', 'discountCapType', 'fixed')}
                      >
                        {getCurrentTabState().discountCapType === 'fixed' && (
                          <Check className="h-4 w-4 text-blue-500 shrink-0" />
                        )}
                        <span>고정</span>
                      </Button>
                    </div>
                  </div>  
                  )}    
                </div>

                {/* 사용가능 기준금액 */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label className="w-full text-muted-foreground">사용가능 기준금액</Label>
                  <Select
                    value={getCurrentTabState().hurdleTarget}
                    onValueChange={(value: string) => handleTabStateChange('tab2', 'hurdleTarget', value)}
                  >
                      <SelectTrigger className="w-full h-10">
                      <SelectValue placeholder="기준금액 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pricing_price">채널별판매가</SelectItem>
                      <SelectItem value="discount_price">즉시할인가</SelectItem>
                      <SelectItem value="coupon_price_1">쿠폰적용가1</SelectItem>
                      <SelectItem value="coupon_price_2">쿠폰적용가2</SelectItem>
                      <SelectItem value="coupon_price_3">쿠폰적용가3</SelectItem>
                    </SelectContent>
                  </Select> 
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label className="w-full text-muted-foreground">기준금액 (원 이상)</Label>
                    <div className="relative">
                  <Input
                        type="text"
                        value={formatNumber(getCurrentTabState().hurdleAmount)}
                        onChange={(e) => handleNumberChange('tab2', 'hurdleAmount', e.target.value)}
                        className="w-full h-10"
                    placeholder="예: 50000"
                  />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">원</span>
                    </div>
                </div>

                  <div className="flex flex-col gap-2">
                    <Label className="w-full text-muted-foreground">할인적용 기준금액</Label>
                  <Select
                    value={getCurrentTabState().discountBase}
                    onValueChange={(value: string) => handleTabStateChange('tab2', 'discountBase', value)}
                  >
                      <SelectTrigger className="w-full h-10">
                      <SelectValue placeholder="기준금액 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pricing_price">채널별판매가</SelectItem>
                      <SelectItem value="discount_price">즉시할인가</SelectItem>
                      <SelectItem value="coupon_price_1">쿠폰적용가1</SelectItem>
                      <SelectItem value="coupon_price_2">쿠폰적용가2</SelectItem>
                      <SelectItem value="coupon_price_3">쿠폰적용가3</SelectItem>
                    </SelectContent>
                  </Select>
                  </div>
                </div>

                {/* 할인금액 입력 필드 */}
                {getCurrentTabState().discountType === 'amount' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2"> 
                      <Label className="w-full text-muted-foreground">할인금액</Label>
                      <div className="relative">
                    <Input
                          type="text"
                          value={formatNumber(getCurrentTabState().discountValue)}
                          onChange={(e) => handleNumberChange('tab2', 'discountValue', e.target.value)}
                          className="w-full h-10"
                      placeholder="할인금액 입력"
                    />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">원</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label className="w-full text-muted-foreground">자사부담</Label>
                      <div className="relative">
                    <Input
                          type="text"
                          value={formatNumber(getCurrentTabState().selfRatio)}
                          onChange={(e) => handleNumberChange('tab2', 'selfRatio', e.target.value)}
                          className="w-full h-10"
                      placeholder="%"
                    />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 할인율 입력 필드 */}
                {getCurrentTabState().discountType === 'rate' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <Label className="w-full text-muted-foreground">할인율</Label>
                        <div className="relative">
                      <Input
                            type="text"
                            value={formatNumber(getCurrentTabState().discountValue)}
                            onChange={(e) => handleNumberChange('tab2', 'discountValue', e.target.value)}
                            className="w-full h-10"
                        placeholder="할인율 입력"
                      />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                        </div>
                      </div>
                      {getCurrentTabState().discountType === 'rate' && (
                        <> 
                          <div className="flex flex-col gap-2">
                            <Label className="w-full text-muted-foreground">소수점</Label>
                            <div className="flex gap-2">
                          <Select
                            value={getCurrentTabState().decimalPoint}
                            onValueChange={(value: '0.01' | '0.1' | '1' | 'none') => handleTabStateChange('tab2', 'decimalPoint', value)}
                          >
                                <SelectTrigger className="w-full h-10">
                              <SelectValue placeholder="소수점" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">소수점</SelectItem>
                              <SelectItem value="0.01">0.01</SelectItem>
                              <SelectItem value="0.1">0.1</SelectItem>
                              <SelectItem value="1">1</SelectItem>
                            </SelectContent>
                          </Select> 

                              {getCurrentTabState().decimalPoint !== 'none' && (
                          <Select
                            value={getCurrentTabState().roundType}
                            onValueChange={(value: 'floor' | 'ceil' | 'round') => handleTabStateChange('tab2', 'roundType', value)}
                          >
                                  <SelectTrigger className="w-full h-10">
                              <SelectValue placeholder="반올림" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ceil">올림</SelectItem>
                              <SelectItem value="floor">내림</SelectItem>
                              <SelectItem value="round">반올림</SelectItem>
                            </SelectContent>
                          </Select>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <div className="relative">
                          <Label className="w-full text-muted-foreground">
                          {getCurrentTabState().discountCapType === 'max' ? '최대할인금액' : '고정할인금액'}
                          </Label>
                          <div className="relative">
                      <Input
                              type="text"
                              value={formatNumber(getCurrentTabState().discountCap)}
                              onChange={(e) => handleNumberChange('tab2', 'discountCap', e.target.value)}
                              className="w-full h-10"
                              placeholder="할인금액"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">원</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label className="w-full text-muted-foreground">자사부담</Label>
                        <div className="relative">
                      <Input
                            type="text"
                            value={formatNumber(getCurrentTabState().selfRatio)}
                            onChange={(e) => handleNumberChange('tab2', 'selfRatio', e.target.value)}
                            className="w-full h-10"
                        placeholder="%"
                      />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                        </div>
                      </div> 
                    </div>
                  </>
                )}
              </div> 
              <div className="mt-4 flex justify-end">
                <Button onClick={() => handleApplyDiscount('coupon2', getCurrentTabState())}>쿠폰2 적용</Button>
              </div>
            </TabsContent>
            {/* ===== 쿠폰2 탭 끝 ===== */}

            {/* ===== 쿠폰3 탭 시작 ===== */}
            <TabsContent value="tab3">
              <div className="grid gap-4 py-4">
                {/* 할인 적용 기준금액 및 할인 구분 */}
                <div className="grid grid-cols-3 gap-4 pb-4">
                  <div className="flex flex-col gap-2">  
                    <Label className="w-full text-muted-foreground">할인타입</Label>
                    <div className="flex gap-1">
                      <Button
                        variant={getCurrentTabState().discountType === 'amount' ? 'default' : 'outline'}
                        className={`h-8 rounded-full flex items-center justify-center gap-1.5 font-bold ${
                          getCurrentTabState().discountType === 'amount' 
                          ? 'border border-blue-500 bg-blue-50 text-blue-500 hover:bg-blue-100 pl-2 pr-3' 
                          : 'bg-transparent text-gray-500 border-gray-200 px-3'
                        }`}
                        onClick={() => handleTabStateChange('tab3', 'discountType', 'amount')}
                      >
                        {getCurrentTabState().discountType === 'amount' && (
                          <Check className="h-4 w-4 text-blue-500 shrink-0" />
                        )}
                        <span>원</span>
                      </Button>
                      <Button
                        variant={getCurrentTabState().discountType === 'rate' ? 'default' : 'outline'}
                        className={`h-8 rounded-full flex items-center justify-center gap-1.5 font-bold ${
                          getCurrentTabState().discountType === 'rate' 
                          ? 'border border-blue-500 bg-blue-50 text-blue-500 hover:bg-blue-100 pl-2 pr-3' 
                          : 'bg-transparent text-gray-500 border-gray-200 px-3'
                        }`}
                        onClick={() => handleTabStateChange('tab3', 'discountType', 'rate')}
                      >
                        {getCurrentTabState().discountType === 'rate' && (
                          <Check className="h-4 w-4 text-blue-500 shrink-0" />
                        )}
                        <span>%</span>
                      </Button>
                    </div>
                  </div>

                  {getCurrentTabState().discountType === 'rate' && (
                  <div className="flex flex-col gap-2">      
                    <Label className="w-full text-muted-foreground">할인금액</Label>
                    <div className="flex gap-1"> 
                      <Button
                        variant={getCurrentTabState().discountCapType === 'max' ? 'default' : 'outline'}
                        className={`h-8 rounded-full flex items-center justify-center gap-1.5 font-bold ${
                          getCurrentTabState().discountCapType === 'max' 
                          ? 'border border-blue-500 bg-blue-50 text-blue-500 hover:bg-blue-100 pl-2 pr-3' 
                          : 'bg-transparent text-gray-500 border-gray-200 px-3'
                        }`}
                        onClick={() => handleTabStateChange('tab3', 'discountCapType', 'max')}
                      >
                        {getCurrentTabState().discountCapType === 'max' && (
                          <Check className="h-4 w-4 text-blue-500 shrink-0" />
                        )}
                        <span>최대</span>
                      </Button>
                      <Button
                        variant={getCurrentTabState().discountCapType === 'fixed' ? 'default' : 'outline'}
                        className={`h-8 rounded-full flex items-center justify-center gap-1.5 font-bold ${
                          getCurrentTabState().discountCapType === 'fixed' 
                          ? 'border border-blue-500 bg-blue-50 text-blue-500 hover:bg-blue-100 pl-2 pr-3' 
                          : 'bg-transparent text-gray-500 border-gray-200 px-3'
                        }`}
                        onClick={() => handleTabStateChange('tab3', 'discountCapType', 'fixed')}
                      >
                        {getCurrentTabState().discountCapType === 'fixed' && (
                          <Check className="h-4 w-4 text-blue-500 shrink-0" />
                        )}
                        <span>고정</span>
                      </Button>
                    </div>
                  </div>  
                  )}
                </div>

                {/* 사용가능 기준금액 */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label className="w-full text-muted-foreground">사용가능 기준금액</Label>
                  <Select
                    value={getCurrentTabState().hurdleTarget}
                    onValueChange={(value: string) => handleTabStateChange('tab3', 'hurdleTarget', value)}
                  >
                      <SelectTrigger className="w-full h-10">
                      <SelectValue placeholder="기준금액 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pricing_price">채널별판매가</SelectItem>
                      <SelectItem value="discount_price">즉시할인가</SelectItem>
                      <SelectItem value="coupon_price_1">쿠폰적용가1</SelectItem>
                      <SelectItem value="coupon_price_2">쿠폰적용가2</SelectItem>
                      <SelectItem value="coupon_price_3">쿠폰적용가3</SelectItem>
                    </SelectContent>
                  </Select> 
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label className="w-full text-muted-foreground">기준금액 (원 이상)</Label>
                    <div className="relative">
                  <Input
                        type="text"
                        value={formatNumber(getCurrentTabState().hurdleAmount)}
                        onChange={(e) => handleNumberChange('tab3', 'hurdleAmount', e.target.value)}
                        className="w-full h-10"
                    placeholder="예: 50000"
                  />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">원</span>
                    </div>
                </div>

                  <div className="flex flex-col gap-2">
                    <Label className="w-full text-muted-foreground">할인적용 기준금액</Label>
                  <Select
                    value={getCurrentTabState().discountBase}
                    onValueChange={(value: string) => handleTabStateChange('tab3', 'discountBase', value)}
                  >
                      <SelectTrigger className="w-full h-10">
                      <SelectValue placeholder="기준금액 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pricing_price">채널별판매가</SelectItem>
                      <SelectItem value="discount_price">즉시할인가</SelectItem>
                      <SelectItem value="coupon_price_1">쿠폰적용가1</SelectItem>
                      <SelectItem value="coupon_price_2">쿠폰적용가2</SelectItem>
                      <SelectItem value="coupon_price_3">쿠폰적용가3</SelectItem>
                    </SelectContent>
                  </Select>
                  </div>
                </div>

                {/* 할인금액 입력 필드 */}
                {getCurrentTabState().discountType === 'amount' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2"> 
                      <Label className="w-full text-muted-foreground">할인금액</Label>
                      <div className="relative">
                    <Input
                          type="text"
                          value={formatNumber(getCurrentTabState().discountValue)}
                          onChange={(e) => handleNumberChange('tab3', 'discountValue', e.target.value)}
                          className="w-full h-10"
                      placeholder="할인금액 입력"
                    />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">원</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label className="w-full text-muted-foreground">자사부담</Label>
                      <div className="relative">
                    <Input
                          type="text"
                          value={formatNumber(getCurrentTabState().selfRatio)}
                          onChange={(e) => handleNumberChange('tab3', 'selfRatio', e.target.value)}
                          className="w-full h-10"
                      placeholder="%"
                    />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 할인율 입력 필드 */}
                {getCurrentTabState().discountType === 'rate' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <Label className="w-full text-muted-foreground">할인율</Label>
                        <div className="relative">
                      <Input
                            type="text"
                            value={formatNumber(getCurrentTabState().discountValue)}
                            onChange={(e) => handleNumberChange('tab3', 'discountValue', e.target.value)}
                            className="w-full h-10"
                        placeholder="할인율 입력"
                      />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                        </div>
                      </div>
                      {getCurrentTabState().discountType === 'rate' && (
                        <> 
                          <div className="flex flex-col gap-2">
                            <Label className="w-full text-muted-foreground">소수점</Label>
                            <div className="flex gap-2">
                          <Select
                            value={getCurrentTabState().decimalPoint}
                            onValueChange={(value: '0.01' | '0.1' | '1' | 'none') => handleTabStateChange('tab3', 'decimalPoint', value)}
                          >
                                <SelectTrigger className="w-full h-10">
                              <SelectValue placeholder="소수점" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">소수점</SelectItem>
                              <SelectItem value="0.01">0.01</SelectItem>
                              <SelectItem value="0.1">0.1</SelectItem>
                              <SelectItem value="1">1</SelectItem>
                            </SelectContent>
                          </Select> 

                              {getCurrentTabState().decimalPoint !== 'none' && (
                          <Select
                            value={getCurrentTabState().roundType}
                            onValueChange={(value: 'floor' | 'ceil' | 'round') => handleTabStateChange('tab3', 'roundType', value)}
                          >
                                  <SelectTrigger className="w-full h-10">
                              <SelectValue placeholder="반올림" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ceil">올림</SelectItem>
                              <SelectItem value="floor">내림</SelectItem>
                              <SelectItem value="round">반올림</SelectItem>
                            </SelectContent>
                          </Select>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <div className="relative">
                          <Label className="w-full text-muted-foreground">
                          {getCurrentTabState().discountCapType === 'max' ? '최대할인금액' : '고정할인금액'}
                          </Label>
                          <div className="relative">
                      <Input
                              type="text"
                              value={formatNumber(getCurrentTabState().discountCap)}
                              onChange={(e) => handleNumberChange('tab3', 'discountCap', e.target.value)}
                              className="w-full h-10"
                              placeholder="할인금액"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">원</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label className="w-full text-muted-foreground">자사부담</Label>
                        <div className="relative">
                      <Input
                            type="text"
                            value={formatNumber(getCurrentTabState().selfRatio)}
                            onChange={(e) => handleNumberChange('tab3', 'selfRatio', e.target.value)}
                            className="w-full h-10"
                        placeholder="%"
                      />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                        </div>
                      </div> 
                    </div>
                  </>
                )}
              </div> 
              <div className="mt-4 flex justify-end">
                <Button onClick={() => handleApplyDiscount('coupon3', getCurrentTabState())}>쿠폰3 적용</Button>
              </div>
            </TabsContent>
            {/* ===== 쿠폰3 탭 끝 ===== */}
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}