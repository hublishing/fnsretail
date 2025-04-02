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
import { useState } from "react"
import { Product, ChannelInfo } from '@/app/types/cart'

type DiscountType = '즉시할인' | '최저손익'

interface ImmediateDiscountState {
  discountType: DiscountType
  discountValue: number
  unitType: string
}

interface ImmediateDiscountModalProps {
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

export function ImmediateDiscountModal({ 
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
}: ImmediateDiscountModalProps) {
  const [discountState, setDiscountState] = useState<ImmediateDiscountState>({
    discountType: '즉시할인',
    discountValue: 0,
    unitType: '%'
  })

  const handleStateChange = (field: keyof ImmediateDiscountState, value: any) => {
    setDiscountState(prev => {
      if (field === 'unitType') {
        return {
          ...prev,
          [field]: value,
          discountValue: 0  // 단위 변경 시 입력값 초기화
        }
      }
      return {
        ...prev,
        [field]: value
      }
    })
  }

  const calculateDiscount = (price: number, rate: number) => {
    // 모든 채널에 대해 동일한 계산 방식 적용
    const result = price * (1 - rate / 100);
    // 소수점 2자리까지만 표시
    return Number(result.toFixed(2));
  };

  const handleApplyDiscount = async () => {
    try {
      if (!selectedProducts.length) {
        console.log('선택된 상품이 없음');
        return;
      }

      const updatedProducts = currentProducts.map(product => {
        if (selectedProducts.includes(product.product_id)) {
          const basePrice = Number(product.pricing_price) || 0;
          let newPrice;
          
          if (discountState.discountType === '즉시할인') {
            newPrice = calculateDiscount(basePrice, discountState.discountValue);
          } else {
            newPrice = basePrice - discountState.discountValue;
            newPrice = Math.ceil(newPrice / 10) * 10;
          }
          
          const updatedProduct = { ...product };
          updatedProduct.discount_price = newPrice;
          updatedProduct.discount = Number(product.pricing_price) - newPrice;
          updatedProduct.discount_rate = ((Number(product.pricing_price) - newPrice) / Number(product.pricing_price)) * 100;
          updatedProduct.discount_unit = discountState.unitType;

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
          <DialogTitle>즉시할인 적용</DialogTitle>
          <DialogDescription>
            선택한 상품에 즉시할인을 적용합니다.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* 할인 유형 */}
          <div className="flex items-center gap-2">
            <Label className="w-[110px]">할인 유형</Label>
            <Select
              value={discountState.discountType}
              onValueChange={(value: DiscountType) => handleStateChange('discountType', value)}
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
              {discountState.discountType === '최저손익' ? '최저손익 값' : '할인 값'}
            </Label>
            <Input
              type="number"
              value={discountState.discountValue}
              onChange={(e) => handleStateChange('discountValue', Number(e.target.value))}
              className="w-[150px] h-10"
              placeholder={`예: ${discountState.unitType === '%' ? '10 (10%)' : '1000 (1000원)'}`}
            />
            
            <Select
              value={discountState.unitType}
              onValueChange={(value: string) => handleStateChange('unitType', value)}
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

          <div className="mt-4 flex justify-end">
            <Button onClick={handleApplyDiscount}>즉시할인 적용</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 