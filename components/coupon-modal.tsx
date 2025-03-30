'use client'

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface CouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (coupons: {
    coupon1: { value: number; type: 'percentage' | 'fixed'; minAmount: number };
    coupon2: { value: number; type: 'percentage' | 'fixed'; minAmount: number };
    coupon3: { value: number; type: 'percentage' | 'fixed'; minAmount: number };
  }) => void;
}

interface CouponState {
  value: number;
  type: 'percentage' | 'fixed';
  minAmount: number;
}

export function CouponModal({ isOpen, onClose, onApply }: CouponModalProps) {
  const [coupon1, setCoupon1] = useState<CouponState>({ value: 0, type: 'percentage', minAmount: 0 });
  const [coupon2, setCoupon2] = useState<CouponState>({ value: 0, type: 'percentage', minAmount: 0 });
  const [coupon3, setCoupon3] = useState<CouponState>({ value: 0, type: 'percentage', minAmount: 0 });

  const handleApply = () => {
    onApply({ coupon1, coupon2, coupon3 });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>쿠폰 설정</DialogTitle>
          <DialogDescription>
            각 쿠폰의 할인값과 최소금액을 설정합니다.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* 쿠폰 1 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-[60px] text-sm font-medium">쿠폰1</span>
            </div>
            <div className="flex items-center gap-2"> 
              <Input
                  type="number"
                  value={coupon1.value}
                  onChange={(e) => setCoupon1((prev: CouponState) => ({ ...prev, value: Number(e.target.value) }))}
                  className="w-[100px] h-10"
                  placeholder="할인값"
                />
                <Select
                  value={coupon1.type}
                  onValueChange={(value: 'percentage' | 'fixed') => 
                    setCoupon1((prev: CouponState) => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger className="w-[60px] h-10">
                    <SelectValue placeholder="단위" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">%</SelectItem>
                    <SelectItem value="fixed">원</SelectItem>
                  </SelectContent>
                </Select> 
              <span className="text-sm text-muted-foreground">최소금액:</span>
              <Input
                type="number"
                value={coupon1.minAmount}
                onChange={(e) => setCoupon1((prev: CouponState) => ({ ...prev, minAmount: Number(e.target.value) }))}
                className="w-[100px] h-10"
                placeholder="최소금액"
              />
            </div>
          </div>

          {/* 쿠폰 2 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-[60px] text-sm font-medium">쿠폰2</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={coupon2.value}
                onChange={(e) => setCoupon2((prev: CouponState) => ({ ...prev, value: Number(e.target.value) }))}
                className="w-[100px] h-10"
                placeholder="할인값"
              />
              <Select
                value={coupon2.type}
                onValueChange={(value: 'percentage' | 'fixed') => 
                  setCoupon2((prev: CouponState) => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger className="w-[60px] h-10">
                  <SelectValue placeholder="단위" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">%</SelectItem>
                  <SelectItem value="fixed">원</SelectItem>
                </SelectContent>
              </Select> 
              <span className="text-sm text-muted-foreground">최소금액:</span>
              <Input
                type="number"
                value={coupon2.minAmount}
                onChange={(e) => setCoupon2((prev: CouponState) => ({ ...prev, minAmount: Number(e.target.value) }))}
                className="w-[100px] h-10"
                placeholder="최소금액"
              />
            </div>
          </div>

          {/* 쿠폰 3 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-[60px] text-sm font-medium">쿠폰3</span>
              
            </div>
            <div className="flex items-center gap-2"><Input
                type="number"
                value={coupon3.value}
                onChange={(e) => setCoupon3((prev: CouponState) => ({ ...prev, value: Number(e.target.value) }))}
                className="w-[100px] h-10"
                placeholder="할인값"
              />
              <Select
                value={coupon3.type}
                onValueChange={(value: 'percentage' | 'fixed') => 
                  setCoupon3((prev: CouponState) => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger className="w-[60px] h-10">
                  <SelectValue placeholder="단위" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">%</SelectItem>
                  <SelectItem value="fixed">원</SelectItem>
                </SelectContent>
              </Select> 
              <span className="text-sm text-muted-foreground">최소금액:</span>
              <Input
                type="number"
                value={coupon3.minAmount}
                onChange={(e) => setCoupon3((prev: CouponState) => ({ ...prev, minAmount: Number(e.target.value) }))}
                className="w-[100px] h-10"
                placeholder="최소금액"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleApply}>적용</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 