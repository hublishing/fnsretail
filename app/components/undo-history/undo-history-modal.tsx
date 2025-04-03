import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { UndoHistoryPanel } from './undo-history-panel';
import { EffectMapPanel } from './effect-map-panel';
import { HistoryItem } from '@/app/utils/history';
import { EffectItem, EffectType } from '@/app/utils/effect-map';
import { Product } from '@/app/types/cart';
import { History, GitBranch } from 'lucide-react';

interface UndoHistoryModalProps {
  historyItems: HistoryItem<Product[]>[];
  effects: EffectItem[];
  onUndo: () => void;
  onRedo: () => void;
  onJumpTo: (id: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onFilterByType: (type: EffectType | null) => void;
  onFilterByProductId: (productId: string | null) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function UndoHistoryModal({
  historyItems,
  effects,
  onUndo,
  onRedo,
  onJumpTo,
  canUndo,
  canRedo,
  onFilterByType,
  onFilterByProductId,
  open: controlledOpen,
  onOpenChange: setControlledOpen
}: UndoHistoryModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('history');
  const [selectedEffectType, setSelectedEffectType] = useState<EffectType | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  
  // 외부에서 제어되는 경우와 내부에서 제어되는 경우를 구분
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = setControlledOpen || setInternalOpen;

  // 모달이 열릴 때마다 히스토리 항목과 이펙트를 다시 로드
  useEffect(() => {
    if (open) {
      console.log('모달이 열림, 히스토리 항목 로드:', historyItems?.length || 0);
    }
  }, [open, historyItems]);

  // 디버깅을 위한 콘솔 로그 추가
  console.log('UndoHistoryModal 상태:', {
    open,
    canUndo,
    canRedo,
    historyItemsCount: historyItems?.length || 0,
    effectsCount: effects?.length || 0,
    historyItems,
    effects,
    selectedEffectType,
    selectedProductId
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <History className="h-4 w-4" />
          작업 기록
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>작업 기록 및 이펙트맵</DialogTitle>
          <DialogDescription>
            상품 목록의 변경 사항을 추적하고 관리할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              작업 기록
            </TabsTrigger>
            <TabsTrigger value="effects" className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              이펙트맵
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="history" className="mt-4">
            <UndoHistoryPanel
              historyItems={historyItems}
              onUndo={onUndo}
              onRedo={onRedo}
              onJumpTo={onJumpTo}
              canUndo={canUndo}
              canRedo={canRedo}
            />
          </TabsContent>
          
          <TabsContent value="effects" className="mt-4">
            <EffectMapPanel
              effects={effects}
              onFilterByType={onFilterByType}
              onFilterByProductId={onFilterByProductId}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 