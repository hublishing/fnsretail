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

type DiscountType = '즉시할인' | '최저손익' | 'amount' | 'rate'

interface TabState {
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
  onApplyDiscount: (type: 'discount' | 'coupon1' | 'coupon2' | 'coupon3', state: TabState) => void
}

export function DiscountModal({ showDiscountModal, setShowDiscountModal, onApplyDiscount }: DiscountModalProps) {
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
      hurdleTarget: 'pricing_price',
      hurdleAmount: 0,
      discountBase: 'pricing_price',
      discountType: 'amount',
      discountValue: 0,
      selfRatio: 0,
      roundUnit: 'none',
      roundType: 'floor',
      discountCap: 0,
      unitType: '%'
    },
    tab3: {
      hurdleTarget: 'pricing_price',
      hurdleAmount: 0,
      discountBase: 'pricing_price',
      discountType: 'amount',
      discountValue: 0,
      selfRatio: 0,
      roundUnit: 'none',
      roundType: 'floor',
      discountCap: 0,
      unitType: '%'
    },
    tab4: {
      hurdleTarget: 'pricing_price',
      hurdleAmount: 0,
      discountBase: 'pricing_price',
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
    setTabStates(prev => ({
      ...prev,
      [tab]: {
        ...prev[tab],
        [field]: value
      }
    }))
  }

  const handleApplyDiscount = (type: 'discount' | 'coupon1' | 'coupon2' | 'coupon3') => {
    onApplyDiscount(type, getCurrentTabState())
    setShowDiscountModal(false)
  }

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

                {/* 단위 선택 */}
                <div className="flex items-center gap-2">
                  <Label className="w-[110px]">단위 선택</Label>
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
                  <span className="text-sm text-muted-foreground">{getCurrentTabState().unitType}</span>
                </div>
              </div> 
              <div className="mt-4 flex justify-end">
                <Button onClick={() => handleApplyDiscount('discount')}>즉시할인 적용</Button>
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
                      <SelectItem value="coupon1_price">쿠폰적용가1</SelectItem>
                      <SelectItem value="coupon2_price">쿠폰적용가2</SelectItem>
                      <SelectItem value="coupon3_price">쿠폰적용가3</SelectItem>
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
                      <SelectItem value="coupon1_price">쿠폰적용가1</SelectItem>
                      <SelectItem value="coupon2_price">쿠폰적용가2</SelectItem>
                      <SelectItem value="coupon3_price">쿠폰적용가3</SelectItem>
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
                <Button onClick={() => handleApplyDiscount('coupon1')}>쿠폰1 적용</Button>
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
                      <SelectItem value="coupon1_price">쿠폰적용가1</SelectItem>
                      <SelectItem value="coupon2_price">쿠폰적용가2</SelectItem>
                      <SelectItem value="coupon3_price">쿠폰적용가3</SelectItem>
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
                      <SelectItem value="coupon1_price">쿠폰적용가1</SelectItem>
                      <SelectItem value="coupon2_price">쿠폰적용가2</SelectItem>
                      <SelectItem value="coupon3_price">쿠폰적용가3</SelectItem>
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
                <Button onClick={() => handleApplyDiscount('coupon2')}>쿠폰2 적용</Button>
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
                      <SelectItem value="coupon1_price">쿠폰적용가1</SelectItem>
                      <SelectItem value="coupon2_price">쿠폰적용가2</SelectItem>
                      <SelectItem value="coupon3_price">쿠폰적용가3</SelectItem>
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
                      <SelectItem value="coupon1_price">쿠폰적용가1</SelectItem>
                      <SelectItem value="coupon2_price">쿠폰적용가2</SelectItem>
                      <SelectItem value="coupon3_price">쿠폰적용가3</SelectItem>
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
                <Button onClick={() => handleApplyDiscount('coupon3')}>쿠폰3 적용</Button>
              </div>
            </TabsContent>
            {/* ===== 쿠폰3 탭 끝 ===== */}
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}