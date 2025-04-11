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

  const handleImmediateDiscountApply = async () => {
    try {
      console.log('=== 즉시할인 적용 시작 ===');
      console.log('현재 상태:', {
        discountType: discountState.discountType,
        discountValue: discountState.discountValue,
        unitType: discountState.unitType,
        selectedProducts
      });

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
              newPrice = basePrice - discountState.discountValue;
              newPrice = Math.ceil(newPrice / 10) * 10;
            }
          } else {
            if (discountState.unitType === '%') {
              newPrice = calculateDiscount(basePrice, discountState.discountValue, 'round', '0.01', selectedChannelInfo);
            } else {
              newPrice = basePrice - discountState.discountValue;
              newPrice = Math.ceil(newPrice / 10) * 10;
            }
          }
          
          newPrice = Math.max(0, newPrice);
          
          const updatedProduct = { ...product };
          updatedProduct.discount_price = newPrice;
          updatedProduct.discount = Number(product.pricing_price) - newPrice;
          updatedProduct.discount_rate = ((Number(product.pricing_price) - newPrice) / Number(product.pricing_price)) * 100;
          updatedProduct.discount_unit = discountState.unitType;

          updatedProduct.expected_settlement_amount = calculateExpectedSettlementAmount(updatedProduct);
          updatedProduct.expected_net_profit = calculateExpectedNetProfit(updatedProduct);
          updatedProduct.expected_commission_fee = calculateExpectedCommissionFee(updatedProduct);

          console.log('상품 업데이트:', {
            product_id: updatedProduct.product_id,
            original_price: product.pricing_price,
            new_price: newPrice,
            discount: updatedProduct.discount,
            discount_rate: updatedProduct.discount_rate
          });

          return updatedProduct; 
        }
        return product;
      });

      // 파이어베이스 저장을 먼저 수행
      if (userId) {
        try {
          console.log('=== 파이어베이스 저장 시작 ===');
          const docRef = doc(db, 'userCarts', userId);
          
          const changedProducts = updatedProducts.filter(product => 
            selectedProducts.includes(product.product_id)
          );
          
          // 변경된 상품들의 데이터를 정리
          const cleanedChangedProducts = changedProducts.map(product => {
            const cleanedProduct = { ...product };
            // undefined 값을 가진 필드들을 null로 변환
            Object.keys(cleanedProduct).forEach(key => {
              if (cleanedProduct[key] === undefined) {
                cleanedProduct[key] = null;
              }
            });
            return cleanedProduct;
          });
          
          console.log('변경된 상품 데이터:', cleanedChangedProducts);
          
          const saveData = {
            immediateDiscount: {
              discountType: discountState.discountType,
              discountValue: discountState.discountValue,
              unitType: discountState.unitType,
              appliedProducts: selectedProducts,
            },
          };
          
          console.log('저장할 데이터:', saveData);
          
          const cleanData = removeUndefined(saveData);
          console.log('정리된 데이터:', cleanData);
          
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const existingData = docSnap.data();
            console.log('기존 데이터:', existingData);
            
            let existingProducts = existingData.products || [];
            
            // 기존 상품들의 undefined 값도 정리
            const cleanedExistingProducts = existingProducts.map((product: Product) => {
              const cleanedProduct = { ...product };
              Object.keys(cleanedProduct).forEach(key => {
                if (cleanedProduct[key] === undefined) {
                  cleanedProduct[key] = null;
                }
              });
              return cleanedProduct;
            });
            
            const updatedExistingProducts = cleanedExistingProducts.map((existingProduct: Product) => {
              const changedProduct = cleanedChangedProducts.find(p => p.product_id === existingProduct.product_id);
              return changedProduct || existingProduct;
            });
            
            cleanedChangedProducts.forEach(changedProduct => {
              if (!cleanedExistingProducts.some((p: Product) => p.product_id === changedProduct.product_id)) {
                updatedExistingProducts.push(changedProduct);
              }
            });
            
            cleanData.products = updatedExistingProducts;
          } else {
            cleanData.products = cleanedChangedProducts;
          }
          
          console.log('최종 저장 데이터:', cleanData);
          await setDoc(docRef, cleanData, { merge: true });
          console.log('할인 정보 파이어베이스 저장 완료');
        } catch (error) {
          console.error('할인 정보 파이어베이스 저장 실패:', error);
          // 파이어베이스 저장 실패 시에도 사용자에게 알림만 표시하고 계속 진행
          toast({
            variant: "destructive",
            description: "할인 정보 저장 중 오류가 발생했습니다. 할인은 적용되었습니다.",
          });
        }
      }

      // 파이어베이스 저장 후 상태 업데이트 및 모달 닫기
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
      // 오류 발생 시에도 모달을 닫음
      setShowDiscountModal(false);
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
            <Button onClick={handleImmediateDiscountApply}>즉시할인 적용</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 