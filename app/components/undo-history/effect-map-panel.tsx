import React, { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { EffectItem, EffectType } from '@/app/utils/effect-map';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';

interface EffectMapPanelProps {
  effects: EffectItem[];
  onFilterByType: (type: EffectType | null) => void;
  onFilterByProductId: (productId: string | null) => void;
}

export function EffectMapPanel({
  effects,
  onFilterByType,
  onFilterByProductId
}: EffectMapPanelProps) {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // 이펙트 타입별 그룹화
  const effectsByType = effects.reduce((acc, effect) => {
    if (!acc[effect.type]) {
      acc[effect.type] = [];
    }
    acc[effect.type].push(effect);
    return acc;
  }, {} as Record<EffectType, EffectItem[]>);

  // 상품 ID별 그룹화
  const effectsByProductId = effects.reduce((acc, effect) => {
    effect.productIds.forEach(productId => {
      if (!acc[productId]) {
        acc[productId] = [];
      }
      acc[productId].push(effect);
    });
    return acc;
  }, {} as Record<string, EffectItem[]>);

  // 고유한 상품 ID 목록
  const uniqueProductIds = Array.from(new Set(
    effects.flatMap(effect => effect.productIds)
  ));

  // 고유한 이펙트 타입 목록
  const uniqueEffectTypes = Array.from(new Set(
    effects.map(effect => effect.type)
  ));

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'all') {
      onFilterByType(null);
    } else {
      onFilterByType(value as EffectType);
    }
  };

  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    onFilterByProductId(productId);
  };

  const handleClearFilters = () => {
    setActiveTab('all');
    setSelectedProductId(null);
    onFilterByType(null);
    onFilterByProductId(null);
  };

  return (
    <div className="border rounded-md p-4 bg-white shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">이펙트맵</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleClearFilters}
          disabled={activeTab === 'all' && selectedProductId === null}
        >
          필터 초기화
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">전체</TabsTrigger>
          {uniqueEffectTypes.map(type => (
            <TabsTrigger key={type} value={type}>
              {getEffectTypeLabel(type)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="mt-0">
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2">상품별 필터</h4>
            <div className="flex flex-wrap gap-2">
              {uniqueProductIds.map(productId => (
                <Button
                  key={`product-${productId}`}
                  variant={selectedProductId === productId ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleProductSelect(productId)}
                >
                  {productId}
                </Button>
              ))}
            </div>
          </div>
        </TabsContent>

        {uniqueEffectTypes.map(type => (
          <TabsContent key={type} value={type} className="mt-0">
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">상품별 필터</h4>
              <div className="flex flex-wrap gap-2">
                {uniqueProductIds.map(productId => (
                  <Button
                    key={`product-${productId}`}
                    variant={selectedProductId === productId ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleProductSelect(productId)}
                  >
                    {productId}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <ScrollArea className="h-[300px]">
        <div className="space-y-2">
          {effects.length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              이펙트 기록이 없습니다.
            </div>
          ) : (
            effects.map((effect) => (
              <div 
                key={effect.id}
                className="p-3 border rounded-md hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{effect.description}</div>
                    <div className="text-sm text-gray-500">
                      {formatDistanceToNow(effect.timestamp, { addSuffix: true, locale: ko })}
                    </div>
                    <div className="text-xs mt-1">
                      <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded mr-2">
                        {getEffectTypeLabel(effect.type)}
                      </span>
                      <span className="text-gray-500">
                        {effect.productIds.length}개 상품 영향
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// 이펙트 타입 레이블 변환 함수
function getEffectTypeLabel(type: EffectType): string {
  const labels: Record<EffectType, string> = {
    'PRICE_CHANGE': '가격 변경',
    'DISCOUNT_CHANGE': '할인 변경',
    'COUPON_CHANGE': '쿠폰 변경',
    'LOGISTICS_CHANGE': '물류비 변경',
    'COST_CHANGE': '원가 변경',
    'COMMISSION_CHANGE': '수수료 변경',
    'STOCK_CHANGE': '재고 변경',
    'PRODUCT_ADD': '상품 추가',
    'PRODUCT_REMOVE': '상품 제거',
    'PRODUCT_REORDER': '상품 순서 변경',
    'CHANNEL_CHANGE': '채널 변경',
    'DELIVERY_TYPE_CHANGE': '배송 유형 변경',
    'DATE_CHANGE': '날짜 변경',
    'MEMO_CHANGE': '메모 변경',
    'COLOR_CHANGE': '색상 변경',
    'DIVIDER_CHANGE': '구분선 변경'
  };
  
  return labels[type] || type;
} 