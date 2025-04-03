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
import { calculateDiscount } from '@/app/utils/calculations/common'

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
  decimalPoint: '0.01' | '0.1' | '1' | 'none'
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
      hurdleTarget: 'discount_price',
      hurdleAmount: 0,
      discountBase: 'discount_price',
      discountType: 'amount',
      discountValue: 0,
      selfRatio: 0,
      roundType: 'ceil',
      discountCap: 0,
      decimalPoint: 'none'
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
      decimalPoint: 'none'
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
      decimalPoint: 'none'
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

  const handleApplyDiscount = async (type: 'coupon1' | 'coupon2' | 'coupon3', state: TabState) => {
    try {
      if (!selectedProducts.length) {
        console.log('선택된 상품이 없음');
        return;
      }

      const updatedProducts = currentProducts.map(product => {
        if (selectedProducts.includes(product.product_id)) {
          const basePrice = Number(product[state.discountBase as keyof Product]) || 0;
          let newPrice;
          
          if (state.discountType === 'rate') {
            newPrice = calculateDiscount(basePrice, state.discountValue, state.roundType, state.decimalPoint);
          } else {
            newPrice = basePrice - state.discountValue;
            if (state.roundType === 'floor') {
              newPrice = Math.floor(newPrice / 10) * 10;
            } else {
              newPrice = Math.ceil(newPrice / 10) * 10;
            }
          }
          
          const updatedProduct = { ...product };
          switch (type) {
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
          
          updatedProduct.self_burden_1 = selfBurden1;
          updatedProduct.self_burden_2 = selfBurden2;
          updatedProduct.self_burden_3 = selfBurden3;
          
          const totalBurdenAmount = selfBurden1 + selfBurden2 + selfBurden3;
          updatedProduct.discount_burden_amount = totalBurdenAmount;

          // 예상수수료, 정산예정금액, 예상순이익 재계산
          updatedProduct.expected_settlement_amount = calculateExpectedSettlementAmount(updatedProduct);
          updatedProduct.expected_net_profit = calculateExpectedNetProfit(updatedProduct);
          updatedProduct.expected_commission_fee = calculateExpectedCommissionFee(updatedProduct);

          return updatedProduct;
        }
        return product;
      });

      onApplyDiscount(updatedProducts);
      console.log('할인 적용 완료:', updatedProducts);
      
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
                {/* 사용가능 기준금액 */}
                <div className="flex items-center gap-2">
                  <Label className="w-[110px]">사용가능 기준금액</Label>
                  <Select
                    value={getCurrentTabState().hurdleTarget}
                    onValueChange={(value: string) => handleTabStateChange('tab1', 'hurdleTarget', value)}
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
                    onChange={(e) => handleTabStateChange('tab1', 'hurdleAmount', Number(e.target.value))}
                    className="w-[100px] h-10"
                    placeholder="예: 50000"
                  />
                </div>

                {/* 할인 적용 기준금액 및 할인 구분 */}
                <div className="flex items-center gap-2">
                  <Label className="w-[110px]">할인적용 기준금액</Label>
                  <Select
                    value={getCurrentTabState().discountBase}
                    onValueChange={(value: string) => handleTabStateChange('tab1', 'discountBase', value)}
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
                    onValueChange={(value: DiscountType) => handleTabStateChange('tab1', 'discountType', value)}
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
                {getCurrentTabState().discountType === 'amount' && (
                  <div className="flex items-center gap-2">
                    <Label className="w-[110px]">할인금액 (원)</Label>
                    <Input
                      type="number"
                      value={getCurrentTabState().discountValue}
                      onChange={(e) => handleTabStateChange('tab1', 'discountValue', Number(e.target.value))}
                      className="w-[150px] h-10"
                      placeholder="할인금액 입력"
                    />
                    <Label className="w-[110px] ml-4">자사부담</Label>
                    <Input
                      type="number"
                      value={getCurrentTabState().selfRatio}
                      onChange={(e) => handleTabStateChange('tab1', 'selfRatio', Number(e.target.value))}
                      className="w-[100px] h-10"
                      placeholder="%"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                )}

                {/* 할인율 입력 필드 */}
                {getCurrentTabState().discountType === 'rate' && (
                  <>
                    <div className="flex items-center gap-2">
                      <Label className="w-[110px]">할인율 (%)</Label>
                      <Input
                        type="number"
                        value={getCurrentTabState().discountValue}
                        onChange={(e) => handleTabStateChange('tab1', 'discountValue', Number(e.target.value))}
                        className="w-[100px] h-10"
                        placeholder="할인율 입력"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                      {getCurrentTabState().discountType === 'rate' && (
                        <> 
                          <Select
                            value={getCurrentTabState().decimalPoint}
                            onValueChange={(value: '0.01' | '0.1' | '1' | 'none') => handleTabStateChange('tab1', 'decimalPoint', value)}
                          >
                            <SelectTrigger className="w-[100px] h-10">
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
                              <SelectTrigger className="w-[100px] h-10">
                                <SelectValue placeholder="반올림" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ceil">올림</SelectItem>
                                <SelectItem value="floor">내림</SelectItem>
                                <SelectItem value="round">반올림</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Label className="w-[110px]">최대 할인금액 (원)</Label>
                      <Input
                        type="number"
                        value={getCurrentTabState().discountCap}
                        onChange={(e) => handleTabStateChange('tab1', 'discountCap', Number(e.target.value))}
                        className="w-[100px] h-10"
                        placeholder="최대 할인금액"
                      />
                      <Label className="w-[110px] ml-4">자사부담 (%)</Label>
                      <Input
                        type="number"
                        value={getCurrentTabState().selfRatio}
                        onChange={(e) => handleTabStateChange('tab1', 'selfRatio', Number(e.target.value))}
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
                {getCurrentTabState().discountType === 'amount' && (
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
                {getCurrentTabState().discountType === 'rate' && (
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
                      {getCurrentTabState().discountType === 'rate' && (
                        <> 
                          <Select
                            value={getCurrentTabState().decimalPoint}
                            onValueChange={(value: '0.01' | '0.1' | '1' | 'none') => handleTabStateChange('tab2', 'decimalPoint', value)}
                          >
                            <SelectTrigger className="w-[100px] h-10">
                              <SelectValue placeholder="소수점" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">소수점</SelectItem>
                              <SelectItem value="0.01">0.01</SelectItem>
                              <SelectItem value="0.1">0.1</SelectItem>
                              <SelectItem value="1">1</SelectItem>
                            </SelectContent>
                          </Select> 
                          <Select
                            value={getCurrentTabState().roundType}
                            onValueChange={(value: 'floor' | 'ceil' | 'round') => handleTabStateChange('tab2', 'roundType', value)}
                          >
                            <SelectTrigger className="w-[100px] h-10"> 
                              <SelectValue placeholder="반올림" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ceil">올림</SelectItem>
                              <SelectItem value="floor">내림</SelectItem>
                              <SelectItem value="round">반올림</SelectItem>
                            </SelectContent>
                          </Select>
                        </>
                      )}
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
                <Button onClick={() => handleApplyDiscount('coupon2', getCurrentTabState())}>쿠폰2 적용</Button>
              </div>
            </TabsContent>
            {/* ===== 쿠폰2 탭 끝 ===== */}

            {/* ===== 쿠폰3 탭 시작 ===== */}
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
                {getCurrentTabState().discountType === 'amount' && (
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
                {getCurrentTabState().discountType === 'rate' && (
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
                      {getCurrentTabState().discountType === 'rate' && (
                        <> 
                          <Select
                            value={getCurrentTabState().decimalPoint}
                            onValueChange={(value: '0.01' | '0.1' | '1' | 'none') => handleTabStateChange('tab3', 'decimalPoint', value)}
                          >
                            <SelectTrigger className="w-[100px] h-10">
                              <SelectValue placeholder="소수점" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">소수점</SelectItem>
                              <SelectItem value="0.01">0.01</SelectItem>
                              <SelectItem value="0.1">0.1</SelectItem>
                              <SelectItem value="1">1</SelectItem>
                            </SelectContent>
                          </Select> 
                          <Select
                            value={getCurrentTabState().roundType}
                            onValueChange={(value: 'floor' | 'ceil' | 'round') => handleTabStateChange('tab3', 'roundType', value)}
                          >
                            <SelectTrigger className="w-[100px] h-10">
                              <SelectValue placeholder="반올림" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ceil">올림</SelectItem>
                              <SelectItem value="floor">내림</SelectItem>
                              <SelectItem value="round">반올림</SelectItem>
                            </SelectContent>
                          </Select>
                        </>
                      )}
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