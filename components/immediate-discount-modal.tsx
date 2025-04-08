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
import { useState } from "react"
import { Product, ChannelInfo } from '@/app/types/cart'
import { calculateDiscount } from '@/app/utils/calculations/discount'
import { useToast } from "@/components/ui/use-toast"
import { CheckCircle2 } from "lucide-react"
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// undefined 값을 제거하는 함수 추가
const removeUndefined = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item));
  } else if (obj !== null && typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        result[key] = removeUndefined(obj[key]);
      }
    }
    return result;
  }
  return obj;
};

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
  userId?: string
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
  currentProducts,
  userId
}: ImmediateDiscountModalProps) {
  const { toast } = useToast();
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
            if (discountState.unitType === '%') {
              newPrice = calculateDiscount(basePrice, discountState.discountValue, 'round', '0.01', selectedChannelInfo);
            } else {
              // 원 단위일 때는 직접 금액 차감
              newPrice = basePrice - discountState.discountValue;
              // 10원 단위로 내림
              newPrice = Math.ceil(newPrice / 10) * 10;
            }
          } else {
            // 최저손익 로직 - 단위에 따라 다르게 처리
            if (discountState.unitType === '%') {
              newPrice = calculateDiscount(basePrice, discountState.discountValue, 'round', '0.01', selectedChannelInfo);
            } else {
              // 원 단위면 직접 금액 차감
              newPrice = basePrice - discountState.discountValue;
              // 10원 단위로 내림
              newPrice = Math.ceil(newPrice / 10) * 10;
            }
          }
          
          // 음수 가격 방지
          newPrice = Math.max(0, newPrice);
          
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

      // 파이어베이스에 할인 정보 저장
      if (userId) {
        try {
          const docRef = doc(db, 'userCarts', userId);
          
          // 변경된 상품만 추출
          const changedProducts = updatedProducts.filter(product => 
            selectedProducts.includes(product.product_id)
          );
          
          // 저장할 데이터 준비
          const saveData = {
            immediateDiscount: {
              discountType: discountState.discountType,
              discountValue: discountState.discountValue,
              unitType: discountState.unitType,
              appliedProducts: selectedProducts,
              updatedAt: new Date().toISOString()
            },
            updatedAt: new Date().toISOString()
          };
          
          // undefined 값 제거
          const cleanData = removeUndefined(saveData);
          
          // 기존 데이터 가져오기
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const existingData = docSnap.data();
            
            // 기존 products 배열이 있으면 가져오기
            let existingProducts = existingData.products || [];
            
            // 변경된 상품만 업데이트
            const updatedExistingProducts = existingProducts.map((existingProduct: Product) => {
              const changedProduct = changedProducts.find(p => p.product_id === existingProduct.product_id);
              return changedProduct || existingProduct;
            });
            
            // 새로 추가된 상품이 있다면 추가
            changedProducts.forEach(changedProduct => {
              if (!existingProducts.some((p: Product) => p.product_id === changedProduct.product_id)) {
                updatedExistingProducts.push(changedProduct);
              }
            });
            
            // 최종 저장 데이터에 업데이트된 products 배열 추가
            cleanData.products = updatedExistingProducts;
          } else {
            // 문서가 없는 경우 새로 생성
            cleanData.products = changedProducts;
          }
          
          await setDoc(docRef, cleanData, { merge: true });
          console.log('할인 정보 파이어베이스 저장 완료');
        } catch (error) {
          console.error('할인 정보 파이어베이스 저장 실패:', error);
        }
      }

      onApplyDiscount(updatedProducts);
      console.log('할인 적용 완료:', updatedProducts);
      
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