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
      roundType: 'ceil',
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
      roundType: 'ceil',
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
      roundType: 'ceil',
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
      roundType: 'ceil',
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

  const calculateDiscount = (price: number, rate: number, roundType: 'floor' | 'ceil' = 'ceil') => {
    
    // 1. 할인금액 계산 (소수점 1자리 반올림)
    const discountAmount = Math.round(price * (rate / 100) * 10) / 10;
    console.log('할인금액:', discountAmount);
    
    // 2. 실제 할인된 금액 계산
    const discountedPrice = price - discountAmount;
    
    // 3. 할인된 금액의 1의자리 올림/내림 처리
    let finalPrice;
    switch (roundType) {
      case 'floor':
        // 1의자리 내림 (예: 45857 -> 45850)
        finalPrice = Math.floor(discountedPrice / 10) * 10;
        console.log('1의자리 내림 처리:', finalPrice);
        break;
      case 'ceil':
        // 1의자리 올림 (예: 45857 -> 45860)
        finalPrice = Math.ceil(discountedPrice / 10) * 10;
        console.log('1의자리 올림 처리:', finalPrice);
        break;
      default:
        finalPrice = discountedPrice;
    }
    
    return finalPrice;
  };

  const handleApplyDiscount = async (type: 'discount' | 'coupon1' | 'coupon2' | 'coupon3', state: TabState) => {
    try {
      // 선택된 상품이 없으면 리턴
      if (!selectedProducts.length) {
        console.log('선택된 상품이 없음');
        return;
      }

      // 할인 적용
      const updatedProducts = currentProducts.map(product => {
        if (selectedProducts.includes(product.product_id)) {
          const basePrice = Number(product[state.discountBase as keyof Product]) || 0;
          let newPrice;
          
          // 할인 타입에 따라 다른 계산 방식 적용
          if (type === 'discount') {
            // 즉시할인 탭
            if (state.discountType === '즉시할인') {
              // 퍼센트 할인
              newPrice = calculateDiscount(basePrice, state.discountValue, state.roundType);
            } else {
              // 최저손익
              newPrice = basePrice - state.discountValue;
              if (state.roundType === 'floor') {
                newPrice = Math.floor(newPrice / 10) * 10;
              } else {
                newPrice = Math.ceil(newPrice / 10) * 10;
              }
            }
          } else {
            // 쿠폰 탭
            if (state.discountType === 'rate') {
              // 할인율 적용
              newPrice = calculateDiscount(basePrice, state.discountValue, state.roundType);
            } else {
              // 할인금액 적용
              newPrice = basePrice - state.discountValue;
              if (state.roundType === 'floor') {
                newPrice = Math.floor(newPrice / 10) * 10;
              } else {
                newPrice = Math.ceil(newPrice / 10) * 10;
              }
            }
          }
          
          // 할인 타입에 따라 다른 가격 필드 업데이트
          const updatedProduct = { ...product };
          switch (type) {
            case 'discount':
              // 판매가는 그대로 유지하고 즉시할인가만 변경
              updatedProduct.discount_price = newPrice;
              updatedProduct.discount = Number(product.pricing_price) - newPrice;
              updatedProduct.discount_rate = ((Number(product.pricing_price) - newPrice) / Number(product.pricing_price)) * 100;
              updatedProduct.discount_unit = state.unitType;
              break;
            case 'coupon1':
              updatedProduct.coupon_price_1 = newPrice;
              break;
            case 'coupon2':
              updatedProduct.coupon_price_2 = newPrice;
              break;
            case 'coupon3':
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
          
          // 쿠폰별 자사부담액 계산 및 저장
          // 이전 자사부담액 유지
          const prevSelfBurden1 = product.self_burden_1 || 0;
          const prevSelfBurden2 = product.self_burden_2 || 0;
          const prevSelfBurden3 = product.self_burden_3 || 0;
          
          // 현재 적용되는 쿠폰의 자사부담액만 새로 계산
          let selfBurden1 = prevSelfBurden1;
          let selfBurden2 = prevSelfBurden2;
          let selfBurden3 = prevSelfBurden3;
          
          // 즉시할인인 경우 자사부담액 초기화
          if (type === 'discount') {
            selfBurden1 = 0;
            selfBurden2 = 0;
            selfBurden3 = 0;
          } else {
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
          }
          
          // 각 쿠폰별 자사부담액 저장
          updatedProduct.self_burden_1 = selfBurden1;
          updatedProduct.self_burden_2 = selfBurden2;
          updatedProduct.self_burden_3 = selfBurden3;
          
          // 총 자사부담액 계산 (누적 합계)
          const totalBurdenAmount = selfBurden1 + selfBurden2 + selfBurden3;
          
          console.log('할인부담액 계산 상세:', {
            productId: updatedProduct.product_id,
            couponPrice1: updatedProduct.coupon_price_1,
            couponPrice2: updatedProduct.coupon_price_2,
            couponPrice3: updatedProduct.coupon_price_3,
            selfRatio: state.selfRatio,
            discountAmount1,
            discountAmount2,
            discountAmount3,
            selfBurden1,
            selfBurden2,
            selfBurden3,
            totalBurdenAmount,
            calculation1: updatedProduct.coupon_price_1 ? `${discountAmount1} * (${state.selfRatio} / 100)` : '0',
            calculation2: updatedProduct.coupon_price_2 ? `${discountAmount2} * (${state.selfRatio} / 100)` : '0',
            calculation3: updatedProduct.coupon_price_3 ? `${discountAmount3} * (${state.selfRatio} / 100)` : '0'
          });
          
          updatedProduct.discount_burden_amount = totalBurdenAmount;

          // 예상수수료, 정산예정금액, 예상순이익 재계산
          updatedProduct.expected_settlement_amount = calculateExpectedSettlementAmount(updatedProduct);
          updatedProduct.expected_net_profit = calculateExpectedNetProfit(updatedProduct);
          updatedProduct.expected_commission_fee = calculateExpectedCommissionFee(updatedProduct);

          return updatedProduct;
        }
        return product;
      });

      // 상태 업데이트
      onApplyDiscount(updatedProducts);
      console.log('할인 적용 완료:', updatedProducts);
      
      // 모달 닫기
      setShowDiscountModal(false);
      alert('할인이 적용되었습니다.');
    } catch (error) {
      console.error('할인 적용 중 오류:', error);
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
                      <Label className="w-[80px]">1의자리</Label>
                      <Select
                        value={getCurrentTabState().roundType}
                        onValueChange={(value: 'floor' | 'ceil') => handleTabStateChange('tab2', 'roundType', value)}
                      >
                        <SelectTrigger className="w-[100px] h-10">
                          <SelectValue placeholder="내림" />
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
                      <Label className="w-[80px]">1의자리</Label>
                      <Select
                        value={getCurrentTabState().roundType}
                        onValueChange={(value: 'floor' | 'ceil') => handleTabStateChange('tab3', 'roundType', value)}
                      >
                        <SelectTrigger className="w-[100px] h-10">
                          <SelectValue placeholder="내림" />
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
                      <Label className="w-[80px]">1의자리</Label>
                      <Select
                        value={getCurrentTabState().roundType}
                        onValueChange={(value: 'floor' | 'ceil') => handleTabStateChange('tab4', 'roundType', value)}
                      >
                        <SelectTrigger className="w-[100px] h-10">
                          <SelectValue placeholder="내림" />
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