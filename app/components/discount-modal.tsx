import { Button } from "@/app/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs"
import { useState } from "react"
import { Product, ChannelInfo } from '@/app/types/cart'

type DiscountType = '즉시할인' | '최저손익' | 'amount' | 'rate'

export interface TabState {
  hurdleTarget: string
  hurdleAmount: number
  discountBase: string
  discountType: DiscountType
  discountValue: number
  selfRatio: number
  roundUnit: string
  roundType: 'floor' | 'ceil'
  discountCap: number
  unitType: string
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
  selectedChannelInfo
}: DiscountModalProps) {
  const [currentTab, setCurrentTab] = useState('tab1')
  const [tabStates, setTabStates] = useState<Record<string, TabState>>({
    tab1: {
      hurdleTarget: 'pricing_price',
      hurdleAmount: 0,
      discountBase: 'pricing_price',
      discountType: '즉시할인',
      discountValue: 0,
      selfRatio: 0,
      roundUnit: 'none',
      roundType: 'floor',
      discountCap: 0,
      unitType: '%'
    },
    tab2: {
      hurdleTarget: 'discount_price',
      hurdleAmount: 0,
      discountBase: 'discount_price',
      discountType: 'amount',
      discountValue: 0,
      selfRatio: 0,
      roundUnit: 'none',
      roundType: 'floor',
      discountCap: 0,
      unitType: '%'
    },
    tab3: {
      hurdleTarget: 'coupon_price_1',
      hurdleAmount: 0,
      discountBase: 'coupon_price_1',
      discountType: 'amount',
      discountValue: 0,
      selfRatio: 0,
      roundUnit: 'none',
      roundType: 'floor',
      discountCap: 0,
      unitType: '%'
    },
    tab4: {
      hurdleTarget: 'coupon_price_2',
      hurdleAmount: 0,
      discountBase: 'coupon_price_2',
      discountType: 'amount',
      discountValue: 0,
      selfRatio: 0,
      roundUnit: 'none',
      roundType: 'floor',
      discountCap: 0,
      unitType: '%'
    }
  })

  const handleTabChange = (value: string) => {
    setCurrentTab(value)
  }

  const getCurrentTabState = () => {
    return tabStates[currentTab]
  }

  const handleTabStateChange = (tab: string, field: keyof TabState, value: any) => {
    setTabStates(prev => {
      const currentState = prev[tab];
      
      // 단위 변경 시 입력값 초기화
      if (field === 'unitType') {
        return {
      ...prev,
      [tab]: {
            ...currentState,
            [field]: value,
            discountValue: 0  // 입력값 초기화
          }
        };
      }
      
      return {
        ...prev,
        [tab]: {
          ...currentState,
          [field]: value
        }
      };
    });
  }

  const handleApplyDiscount = async (type: 'discount' | 'coupon1' | 'coupon2' | 'coupon3', state: TabState) => {
    try {
      console.log('=== 할인 적용 시작 ===');
      console.log('할인 유형:', type);
      console.log('현재 탭 상태:', state);

      const updatedProducts = products.map(product => {
        // 선택되지 않은 상품은 그대로 반환
        if (!selectedProducts.includes(product.product_id)) {
          return product;
        }

        console.log(`\n=== 상품 ${product.product_id} 처리 시작 ===`);
        const newProduct = { ...product };
        
        if (type === 'discount') {
          console.log('즉시할인 적용');
          // 즉시할인 로직
          const basePrice = Number(newProduct.pricing_price) || 0;
          console.log('기본 가격:', basePrice);
          let discountAmount = 0;
          
          if (state.discountType === '즉시할인') {
            console.log('즉시할인 타입: 퍼센트/금액');
            // 즉시할인 계산
            if (state.unitType === '%') {
              // 퍼센트 할인
              discountAmount = Math.floor(basePrice * (state.discountValue / 100));
              console.log('퍼센트 할인:', state.discountValue, '%');
            } else {
              // 금액 할인
              discountAmount = state.discountValue;
              console.log('금액 할인:', state.discountValue, '원');
            }
          } else if (state.discountType === '최저손익') {
            console.log('최저손익 타입');
            // 최저손익 계산
            const costSum = (Number(newProduct.org_price) || 0) + 
                          (Number(newProduct.domestic_delivery_fee) || 0) + 
                          (Number(newProduct.shipping_fee) || 0);
            const averageFeeRate = Number(newProduct.average_fee_rate) || 0;
            
            console.log('원가:', newProduct.org_price);
            console.log('국내배송비:', newProduct.domestic_delivery_fee);
            console.log('해외배송비:', newProduct.shipping_fee);
            console.log('평균수수료율:', averageFeeRate);
            
            // 목표가격 = (원가 + 배송비) / (1 - 평균수수료율)
            const targetPrice = costSum / (1 - (averageFeeRate / 100));
            console.log('목표가격:', targetPrice);
            
            if (state.unitType === '%') {
              // 퍼센트 기준 최저손익
              const targetDiscountRate = state.discountValue;
              const currentDiscountRate = ((basePrice - targetPrice) / basePrice) * 100;
              
              console.log('목표할인율:', targetDiscountRate, '%');
              console.log('현재할인율:', currentDiscountRate, '%');
              
              if (currentDiscountRate > targetDiscountRate) {
                discountAmount = basePrice - targetPrice;
                console.log('현재할인율이 더 높음 - 목표가격 기준 적용');
              } else {
                discountAmount = Math.floor(basePrice * (targetDiscountRate / 100));
                console.log('목표할인율 기준 적용');
              }
            } else {
              // 금액 기준 최저손익
              const targetDiscount = state.discountValue;
              const currentDiscount = basePrice - targetPrice;
              
              console.log('목표할인금액:', targetDiscount, '원');
              console.log('현재할인금액:', currentDiscount, '원');
              
              if (currentDiscount > targetDiscount) {
                discountAmount = basePrice - targetPrice;
                console.log('현재할인금액이 더 높음 - 목표가격 기준 적용');
              } else {
                discountAmount = targetDiscount;
                console.log('목표할인금액 기준 적용');
              }
            }
          }
          
          console.log('최종 할인금액:', discountAmount);
          // 할인금액 적용
          newProduct.discount_price = basePrice - discountAmount;
          newProduct.discount = discountAmount;
          newProduct.discount_rate = (discountAmount / basePrice) * 100;
          newProduct.discount_unit = state.unitType;
          
          // props로 받은 함수 사용
          newProduct.expected_settlement_amount = calculateExpectedSettlementAmount(newProduct);
          
          // 예상순이익 재계산
          newProduct.expected_net_profit = calculateExpectedNetProfit(newProduct);
          
          // 예상수수료 재계산
          console.log('=== 할인 모달에서 예상수수료 계산 ===');
          console.log('채널 정보:', selectedChannelInfo);
          console.log('상품 정보:', newProduct);
          newProduct.expected_commission_fee = calculateExpectedCommissionFee(newProduct);
          console.log('계산된 예상수수료:', newProduct.expected_commission_fee);
          
          console.log('최종 가격:', newProduct.discount_price);
          console.log('할인율:', newProduct.discount_rate, '%');
        } else if (type === 'coupon1') {
          console.log('쿠폰1 적용');
          // 쿠폰1 로직
          const basePrice = Number(newProduct[state.discountBase as keyof Product]) || 0;
          const hurdlePrice = Number(newProduct[state.hurdleTarget as keyof Product]) || 0;
          
          console.log('기준가격:', basePrice);
          console.log('기준가격 필드:', state.discountBase);
          console.log('사용가능 기준가격:', hurdlePrice);
          console.log('사용가능 기준가격 필드:', state.hurdleTarget);
          console.log('사용가능 기준금액:', state.hurdleAmount);
          
          if (hurdlePrice >= state.hurdleAmount) {
            console.log('사용가능 기준 충족');
            let discountAmount = 0;
            
            if (state.discountType === 'amount') {
              discountAmount = state.discountValue;
              console.log('금액 할인:', discountAmount, '원');
            } else if (state.discountType === 'rate') {
              discountAmount = Math.floor(basePrice * (state.discountValue / 100));
              console.log('율 할인:', state.discountValue, '%');
              
              // 절사 처리
              if (state.roundUnit !== 'none') {
                const roundValue = parseInt(state.roundUnit);
                if (state.roundType === 'floor') {
                  discountAmount = Math.floor(discountAmount / roundValue) * roundValue;
                  console.log('절사(내림) 적용:', roundValue);
                } else {
                  discountAmount = Math.ceil(discountAmount / roundValue) * roundValue;
                  console.log('절사(올림) 적용:', roundValue);
                }
              }
              
              // 최대 할인금액 제한
              if (state.discountCap > 0 && discountAmount > state.discountCap) {
                console.log('최대 할인금액 제한 적용:', state.discountCap);
                discountAmount = state.discountCap;
              }
            }
            
            // 자사부담 계산
            const selfBurdenAmount = Math.floor(discountAmount * (state.selfRatio / 100));
            discountAmount = discountAmount - selfBurdenAmount;
            
            console.log('자사부담:', selfBurdenAmount, '원');
            console.log('최종 할인금액:', discountAmount, '원');
            
            newProduct.coupon_price_1 = basePrice - discountAmount;
            newProduct.discount_burden_amount = selfBurdenAmount;
            
            // 예상수수료 재계산
            newProduct.expected_commission_fee = calculateExpectedCommissionFee(newProduct);
            
            // 정산예정금액 재계산
            newProduct.expected_settlement_amount = calculateExpectedSettlementAmount(newProduct);
            
            // 예상순이익 재계산
            newProduct.expected_net_profit = calculateExpectedNetProfit(newProduct);
            
            console.log('최종 가격:', newProduct.coupon_price_1);
          } else {
            console.log('사용가능 기준 미충족 - 쿠폰 적용 안함');
          }
        } else if (type === 'coupon2') {
          console.log('쿠폰2 적용');
          // 쿠폰2 로직
          const basePrice = Number(newProduct[state.discountBase as keyof Product]) || 0;
          const hurdlePrice = Number(newProduct[state.hurdleTarget as keyof Product]) || 0;
          
          console.log('기준가격:', basePrice);
          console.log('기준가격 필드:', state.discountBase);
          console.log('사용가능 기준가격:', hurdlePrice);
          console.log('사용가능 기준가격 필드:', state.hurdleTarget);
          console.log('사용가능 기준금액:', state.hurdleAmount);
          
          if (hurdlePrice >= state.hurdleAmount) {
            console.log('사용가능 기준 충족');
            let discountAmount = 0;
            
            if (state.discountType === 'amount') {
              discountAmount = state.discountValue;
              console.log('금액 할인:', discountAmount, '원');
            } else if (state.discountType === 'rate') {
              discountAmount = Math.floor(basePrice * (state.discountValue / 100));
              console.log('율 할인:', state.discountValue, '%');
              
              // 절사 처리
              if (state.roundUnit !== 'none') {
                const roundValue = parseInt(state.roundUnit);
                if (state.roundType === 'floor') {
                  discountAmount = Math.floor(discountAmount / roundValue) * roundValue;
                  console.log('절사(내림) 적용:', roundValue);
                } else {
                  discountAmount = Math.ceil(discountAmount / roundValue) * roundValue;
                  console.log('절사(올림) 적용:', roundValue);
                }
              }
              
              // 최대 할인금액 제한
              if (state.discountCap > 0 && discountAmount > state.discountCap) {
                console.log('최대 할인금액 제한 적용:', state.discountCap);
                discountAmount = state.discountCap;
              }
            }
            
            // 자사부담 계산
            const selfBurdenAmount = Math.floor(discountAmount * (state.selfRatio / 100));
            discountAmount = discountAmount - selfBurdenAmount;
            
            console.log('자사부담:', selfBurdenAmount, '원');
            console.log('최종 할인금액:', discountAmount, '원');
            
            newProduct.coupon_price_2 = basePrice - discountAmount;
            newProduct.discount_burden_amount = selfBurdenAmount;
            
            // 예상수수료 재계산
            newProduct.expected_commission_fee = calculateExpectedCommissionFee(newProduct);
            
            // 정산예정금액 재계산
            newProduct.expected_settlement_amount = calculateExpectedSettlementAmount(newProduct);
            
            // 예상순이익 재계산
            newProduct.expected_net_profit = calculateExpectedNetProfit(newProduct);
            
            console.log('최종 가격:', newProduct.coupon_price_2);
          } else {
            console.log('사용가능 기준 미충족 - 쿠폰 적용 안함');
          }
        } else if (type === 'coupon3') {
          console.log('쿠폰3 적용');
          // 쿠폰3 로직
          const basePrice = Number(newProduct[state.discountBase as keyof Product]) || 0;
          const hurdlePrice = Number(newProduct[state.hurdleTarget as keyof Product]) || 0;
          
          console.log('기준가격:', basePrice);
          console.log('기준가격 필드:', state.discountBase);
          console.log('사용가능 기준가격:', hurdlePrice);
          console.log('사용가능 기준가격 필드:', state.hurdleTarget);
          console.log('사용가능 기준금액:', state.hurdleAmount);
          
          if (hurdlePrice >= state.hurdleAmount) {
            console.log('사용가능 기준 충족');
            let discountAmount = 0;
            
            if (state.discountType === 'amount') {
              discountAmount = state.discountValue;
              console.log('금액 할인:', discountAmount, '원');
            } else if (state.discountType === 'rate') {
              discountAmount = Math.floor(basePrice * (state.discountValue / 100));
              console.log('율 할인:', state.discountValue, '%');
              
              // 절사 처리
              if (state.roundUnit !== 'none') {
                const roundValue = parseInt(state.roundUnit);
                if (state.roundType === 'floor') {
                  discountAmount = Math.floor(discountAmount / roundValue) * roundValue;
                  console.log('절사(내림) 적용:', roundValue);
                } else {
                  discountAmount = Math.ceil(discountAmount / roundValue) * roundValue;
                  console.log('절사(올림) 적용:', roundValue);
                }
              }
              
              // 최대 할인금액 제한
              if (state.discountCap > 0 && discountAmount > state.discountCap) {
                console.log('최대 할인금액 제한 적용:', state.discountCap);
                discountAmount = state.discountCap;
              }
            }
            
            // 자사부담 계산
            const selfBurdenAmount = Math.floor(discountAmount * (state.selfRatio / 100));
            discountAmount = discountAmount - selfBurdenAmount;
            
            console.log('자사부담:', selfBurdenAmount, '원');
            console.log('최종 할인금액:', discountAmount, '원');
            
            newProduct.coupon_price_3 = basePrice - discountAmount;
            newProduct.discount_burden_amount = selfBurdenAmount;
            
            // 예상수수료 재계산
            newProduct.expected_commission_fee = calculateExpectedCommissionFee(newProduct);
            
            // 정산예정금액 재계산
            newProduct.expected_settlement_amount = calculateExpectedSettlementAmount(newProduct);
            
            // 예상순이익 재계산
            newProduct.expected_net_profit = calculateExpectedNetProfit(newProduct);
            
            console.log('최종 가격:', newProduct.coupon_price_3);
          } else {
            console.log('사용가능 기준 미충족 - 쿠폰 적용 안함');
          }
        }
        
        console.log(`=== 상품 ${product.product_id} 처리 완료 ===\n`);
        return newProduct;
      });

      onApplyDiscount(updatedProducts);
      setShowDiscountModal(false);
      alert('할인이 적용되었습니다.');
    } catch (error) {
      console.error('할인 적용 중 오류 발생:', error);
      alert('할인 적용 중 오류가 발생했습니다.');
    }
  };

  return (
    <Dialog open={showDiscountModal} onOpenChange={setShowDiscountModal}>
      <DialogContent className="sm:max-w-[600px] bg-background">
        <DialogHeader>
          <DialogTitle>할인 적용</DialogTitle>
          <DialogDescription>
            선택한 상품에 할인을 적용합니다.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Tabs defaultValue="tab1" className="w-full" onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="tab1">즉시할인</TabsTrigger>
              <TabsTrigger value="tab2">쿠폰1</TabsTrigger>
              <TabsTrigger value="tab3">쿠폰2</TabsTrigger>
              <TabsTrigger value="tab4">쿠폰3</TabsTrigger>
            </TabsList>

            {/* ===== 즉시할인 탭 시작 ===== */}
            <TabsContent value="tab1">
              <div className="grid gap-4 py-4">
                {/* 할인 유형 */}
                <div className="flex items-center gap-2">
                  <Label className="w-[110px]">할인 유형</Label>
                  <Select
                    value={getCurrentTabState().discountType}
                    onValueChange={(value: DiscountType) => handleTabStateChange('tab1', 'discountType', value)}
                  >
                    <SelectTrigger className="w-[150px] h-10">
                      <SelectValue placeholder="할인 유형" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="즉시할인">즉시할인</SelectItem>
                      <SelectItem value="최저손익">최저손익</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 할인 값 입력 */}
                  <div className="flex items-center gap-2">
                  <Label className="w-[110px]">
                    {getCurrentTabState().discountType === '최저손익' ? '최저손익 값' : '할인 값'}
                  </Label>
                    <Input
                      type="number"
                      value={getCurrentTabState().discountValue}
                      onChange={(e) => handleTabStateChange('tab1', 'discountValue', Number(e.target.value))}
                      className="w-[150px] h-10"
                    placeholder={`예: ${getCurrentTabState().unitType === '%' ? '10 (10%)' : '1000 (1000원)'}`}
                  />
                  
                    <Select
                    value={getCurrentTabState().unitType}
                    onValueChange={(value: string) => handleTabStateChange('tab1', 'unitType', value)}
                    >
                      <SelectTrigger className="w-[100px] h-10">
                      <SelectValue placeholder="단위" />
                      </SelectTrigger>
                      <SelectContent>
                      <SelectItem value="%">%</SelectItem>
                      <SelectItem value="원">원</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

              </div> 
              <div className="mt-4 flex justify-end">
                <Button onClick={() => handleApplyDiscount('discount', getCurrentTabState())}>즉시할인 적용</Button>
              </div>
            </TabsContent>
            {/* ===== 즉시할인 탭 끝 ===== */}

            {/* ===== 쿠폰1 탭 시작 ===== */}
            <TabsContent value="tab2">
              <div className="grid gap-4 py-4">
                {/* 사용가능 기준금액 */}
                <div className="flex items-center gap-2">
                  <Label className="w-[110px]">사용가능 기준금액</Label>
                  <Select
                    value={getCurrentTabState().hurdleTarget}
                    onValueChange={(value: string) => handleTabStateChange('tab2', 'hurdleTarget', value)}
                  >
                    <SelectTrigger className="w-[150px] h-10">
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
                  <Label className="w-[110px] ml-4">기준금액 (원 이상)</Label>
                  <Input
                    type="number"
                    value={getCurrentTabState().hurdleAmount}
                    onChange={(e) => handleTabStateChange('tab2', 'hurdleAmount', Number(e.target.value))}
                    className="w-[100px] h-10"
                    placeholder="예: 50000"
                  />
                </div>

                {/* 할인 적용 기준금액 및 할인 구분 */}
                <div className="flex items-center gap-2">
                  <Label className="w-[110px]">할인적용 기준금액</Label>
                  <Select
                    value={getCurrentTabState().discountBase}
                    onValueChange={(value: string) => handleTabStateChange('tab2', 'discountBase', value)}
                  >
                    <SelectTrigger className="w-[150px] h-10">
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
                  <Label className="w-[110px] ml-4">할인 구분</Label>
                  <Select
                    value={getCurrentTabState().discountType}
                    onValueChange={(value: DiscountType) => handleTabStateChange('tab2', 'discountType', value)}
                  >
                    <SelectTrigger className="w-[100px] h-10">
                      <SelectValue placeholder="할인 구분" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="amount">할인금액</SelectItem>
                      <SelectItem value="rate">할인율</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 할인금액 입력 필드 */}
                {(getCurrentTabState().discountType as DiscountType) === 'amount' && (
                  <div className="flex items-center gap-2">
                    <Label className="w-[110px]">할인금액 (원)</Label>
                    <Input
                      type="number"
                      value={getCurrentTabState().discountValue}
                      onChange={(e) => handleTabStateChange('tab2', 'discountValue', Number(e.target.value))}
                      className="w-[150px] h-10"
                      placeholder="할인금액 입력"
                    />
                    <Label className="w-[110px] ml-4">자사부담</Label>
                    <Input
                      type="number"
                      value={getCurrentTabState().selfRatio}
                      onChange={(e) => handleTabStateChange('tab2', 'selfRatio', Number(e.target.value))}
                      className="w-[100px] h-10"
                      placeholder="%"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                )}

                {/* 할인율 입력 필드 */}
                {(getCurrentTabState().discountType as DiscountType) === 'rate' && (
                  <>
                    <div className="flex items-center gap-2">
                      <Label className="w-[110px]">할인율 (%)</Label>
                      <Input
                        type="number"
                        value={getCurrentTabState().discountValue}
                        onChange={(e) => handleTabStateChange('tab2', 'discountValue', Number(e.target.value))}
                        className="w-[100px] h-10"
                        placeholder="할인율 입력"
                      />
                      <span className="text-sm text-muted-foreground">%</span>  
                      <Select
                        value={getCurrentTabState().roundUnit}
                        onValueChange={(value: string) => handleTabStateChange('tab2', 'roundUnit', value)}
                      >
                        <SelectTrigger className="w-[100px] h-10">
                          <SelectValue placeholder="절사 기준" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">절사안함</SelectItem>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>  
                      <Select
                        value={getCurrentTabState().roundType}
                        onValueChange={(value: 'floor' | 'ceil') => handleTabStateChange('tab2', 'roundType', value)}
                      >
                        <SelectTrigger className="w-[100px] h-10">
                          <SelectValue placeholder="절사 방식" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="floor">내림</SelectItem>
                          <SelectItem value="ceil">올림</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Label className="w-[110px]">최대 할인금액 (원)</Label>
                      <Input
                        type="number"
                        value={getCurrentTabState().discountCap}
                        onChange={(e) => handleTabStateChange('tab2', 'discountCap', Number(e.target.value))}
                        className="w-[100px] h-10"
                        placeholder="최대 할인금액"
                      />
                      <Label className="w-[110px] ml-4">자사부담 (%)</Label>
                      <Input
                        type="number"
                        value={getCurrentTabState().selfRatio}
                        onChange={(e) => handleTabStateChange('tab2', 'selfRatio', Number(e.target.value))}
                        className="w-[100px] h-10"
                        placeholder="%"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </>
                )}
              </div> 
              <div className="mt-4 flex justify-end">
                <Button onClick={() => handleApplyDiscount('coupon1', getCurrentTabState())}>쿠폰1 적용</Button>
              </div>
            </TabsContent>
            {/* ===== 쿠폰1 탭 끝 ===== */}

            {/* ===== 쿠폰2 탭 시작 ===== */}
            <TabsContent value="tab3">
              <div className="grid gap-4 py-4">
                {/* 사용가능 기준금액 */}
                <div className="flex items-center gap-2">
                  <Label className="w-[110px]">사용가능 기준금액</Label>
                  <Select
                    value={getCurrentTabState().hurdleTarget}
                    onValueChange={(value: string) => handleTabStateChange('tab3', 'hurdleTarget', value)}
                  >
                    <SelectTrigger className="w-[150px] h-10">
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
                  <Label className="w-[110px] ml-4">기준금액 (원 이상)</Label>
                  <Input
                    type="number"
                    value={getCurrentTabState().hurdleAmount}
                    onChange={(e) => handleTabStateChange('tab3', 'hurdleAmount', Number(e.target.value))}
                    className="w-[100px] h-10"
                    placeholder="예: 50000"
                  />
                </div>

                {/* 할인 적용 기준금액 및 할인 구분 */}
                <div className="flex items-center gap-2">
                  <Label className="w-[110px]">할인적용 기준금액</Label>
                  <Select
                    value={getCurrentTabState().discountBase}
                    onValueChange={(value: string) => handleTabStateChange('tab3', 'discountBase', value)}
                  >
                    <SelectTrigger className="w-[150px] h-10">
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
                  <Label className="w-[110px] ml-4">할인 구분</Label>
                  <Select
                    value={getCurrentTabState().discountType}
                    onValueChange={(value: DiscountType) => handleTabStateChange('tab3', 'discountType', value)}
                  >
                    <SelectTrigger className="w-[100px] h-10">
                      <SelectValue placeholder="할인 구분" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="amount">할인금액</SelectItem>
                      <SelectItem value="rate">할인율</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 할인금액 입력 필드 */}
                {(getCurrentTabState().discountType as DiscountType) === 'amount' && (
                  <div className="flex items-center gap-2">
                    <Label className="w-[110px]">할인금액 (원)</Label>
                    <Input
                      type="number"
                      value={getCurrentTabState().discountValue}
                      onChange={(e) => handleTabStateChange('tab3', 'discountValue', Number(e.target.value))}
                      className="w-[150px] h-10"
                      placeholder="할인금액 입력"
                    />
                    <Label className="w-[110px] ml-4">자사부담</Label>
                    <Input
                      type="number"
                      value={getCurrentTabState().selfRatio}
                      onChange={(e) => handleTabStateChange('tab3', 'selfRatio', Number(e.target.value))}
                      className="w-[100px] h-10"
                      placeholder="%"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                )}

                {/* 할인율 입력 필드 */}
                {(getCurrentTabState().discountType as DiscountType) === 'rate' && (
                  <>
                    <div className="flex items-center gap-2">
                      <Label className="w-[110px]">할인율 (%)</Label>
                      <Input
                        type="number"
                        value={getCurrentTabState().discountValue}
                        onChange={(e) => handleTabStateChange('tab3', 'discountValue', Number(e.target.value))}
                        className="w-[100px] h-10"
                        placeholder="할인율 입력"
                      />
                      <span className="text-sm text-muted-foreground">%</span>  
                      <Select
                        value={getCurrentTabState().roundUnit}
                        onValueChange={(value: string) => handleTabStateChange('tab3', 'roundUnit', value)}
                      >
                        <SelectTrigger className="w-[100px] h-10">
                          <SelectValue placeholder="절사 기준" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">절사안함</SelectItem>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>  
                      <Select
                        value={getCurrentTabState().roundType}
                        onValueChange={(value: 'floor' | 'ceil') => handleTabStateChange('tab3', 'roundType', value)}
                      >
                        <SelectTrigger className="w-[100px] h-10">
                          <SelectValue placeholder="절사 방식" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="floor">내림</SelectItem>
                          <SelectItem value="ceil">올림</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Label className="w-[110px]">최대 할인금액 (원)</Label>
                      <Input
                        type="number"
                        value={getCurrentTabState().discountCap}
                        onChange={(e) => handleTabStateChange('tab3', 'discountCap', Number(e.target.value))}
                        className="w-[100px] h-10"
                        placeholder="최대 할인금액"
                      />
                      <Label className="w-[110px] ml-4">자사부담 (%)</Label>
                      <Input
                        type="number"
                        value={getCurrentTabState().selfRatio}
                        onChange={(e) => handleTabStateChange('tab3', 'selfRatio', Number(e.target.value))}
                        className="w-[100px] h-10"
                        placeholder="%"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
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
            <TabsContent value="tab4">
              <div className="grid gap-4 py-4">
                {/* 사용가능 기준금액 */}
                <div className="flex items-center gap-2">
                  <Label className="w-[110px]">사용가능 기준금액</Label>
                  <Select
                    value={getCurrentTabState().hurdleTarget}
                    onValueChange={(value: string) => handleTabStateChange('tab4', 'hurdleTarget', value)}
                  >
                    <SelectTrigger className="w-[150px] h-10">
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
                  <Label className="w-[110px] ml-4">기준금액 (원 이상)</Label>
                  <Input
                    type="number"
                    value={getCurrentTabState().hurdleAmount}
                    onChange={(e) => handleTabStateChange('tab4', 'hurdleAmount', Number(e.target.value))}
                    className="w-[100px] h-10"
                    placeholder="예: 50000"
                  />
                </div>

                {/* 할인 적용 기준금액 및 할인 구분 */}
                <div className="flex items-center gap-2">
                  <Label className="w-[110px]">할인적용 기준금액</Label>
                  <Select
                    value={getCurrentTabState().discountBase}
                    onValueChange={(value: string) => handleTabStateChange('tab4', 'discountBase', value)}
                  >
                    <SelectTrigger className="w-[150px] h-10">
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
                  <Label className="w-[110px] ml-4">할인 구분</Label>
                  <Select
                    value={getCurrentTabState().discountType}
                    onValueChange={(value: DiscountType) => handleTabStateChange('tab4', 'discountType', value)}
                  >
                    <SelectTrigger className="w-[100px] h-10">
                      <SelectValue placeholder="할인 구분" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="amount">할인금액</SelectItem>
                      <SelectItem value="rate">할인율</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 할인금액 입력 필드 */}
                {(getCurrentTabState().discountType as DiscountType) === 'amount' && (
                  <div className="flex items-center gap-2">
                    <Label className="w-[110px]">할인금액 (원)</Label>
                    <Input
                      type="number"
                      value={getCurrentTabState().discountValue}
                      onChange={(e) => handleTabStateChange('tab4', 'discountValue', Number(e.target.value))}
                      className="w-[150px] h-10"
                      placeholder="할인금액 입력"
                    />
                    <Label className="w-[110px] ml-4">자사부담</Label>
                    <Input
                      type="number"
                      value={getCurrentTabState().selfRatio}
                      onChange={(e) => handleTabStateChange('tab4', 'selfRatio', Number(e.target.value))}
                      className="w-[100px] h-10"
                      placeholder="%"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                )}

                {/* 할인율 입력 필드 */}
                {(getCurrentTabState().discountType as DiscountType) === 'rate' && (
                  <>
                    <div className="flex items-center gap-2">
                      <Label className="w-[110px]">할인율 (%)</Label>
                      <Input
                        type="number"
                        value={getCurrentTabState().discountValue}
                        onChange={(e) => handleTabStateChange('tab4', 'discountValue', Number(e.target.value))}
                        className="w-[100px] h-10"
                        placeholder="할인율 입력"
                      />
                      <span className="text-sm text-muted-foreground">%</span>  
                      <Select
                        value={getCurrentTabState().roundUnit}
                        onValueChange={(value: string) => handleTabStateChange('tab4', 'roundUnit', value)}
                      >
                        <SelectTrigger className="w-[100px] h-10">
                          <SelectValue placeholder="절사 기준" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">절사안함</SelectItem>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>  
                      <Select
                        value={getCurrentTabState().roundType}
                        onValueChange={(value: 'floor' | 'ceil') => handleTabStateChange('tab4', 'roundType', value)}
                      >
                        <SelectTrigger className="w-[100px] h-10">
                          <SelectValue placeholder="절사 방식" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="floor">내림</SelectItem>
                          <SelectItem value="ceil">올림</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Label className="w-[110px]">최대 할인금액 (원)</Label>
                      <Input
                        type="number"
                        value={getCurrentTabState().discountCap}
                        onChange={(e) => handleTabStateChange('tab4', 'discountCap', Number(e.target.value))}
                        className="w-[100px] h-10"
                        placeholder="최대 할인금액"
                      />
                      <Label className="w-[110px] ml-4">자사부담 (%)</Label>
                      <Input
                        type="number"
                        value={getCurrentTabState().selfRatio}
                        onChange={(e) => handleTabStateChange('tab4', 'selfRatio', Number(e.target.value))}
                        className="w-[100px] h-10"
                        placeholder="%"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
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