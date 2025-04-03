import React, { useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { HistoryItem } from '@/app/utils/history';
import { Product } from '@/app/types/cart';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface UndoHistoryPanelProps {
  historyItems: HistoryItem<Product[]>[];
  onUndo: () => void;
  onRedo: () => void;
  onJumpTo: (id: string) => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function UndoHistoryPanel({
  historyItems,
  onUndo,
  onRedo,
  onJumpTo,
  canUndo,
  canRedo
}: UndoHistoryPanelProps) {
  // 히스토리 항목이 변경될 때마다 로그 출력
  useEffect(() => {
    console.log('UndoHistoryPanel 히스토리 항목 변경:', {
      historyItemsCount: historyItems?.length || 0,
      historyItems
    });
  }, [historyItems]);

  // 디버깅을 위한 콘솔 로그 추가
  console.log('UndoHistoryPanel 상태:', {
    historyItemsCount: historyItems?.length || 0,
    canUndo,
    canRedo,
    historyItems
  });

  const handleUndo = () => {
    console.log('되돌리기 버튼 클릭됨');
    onUndo();
  };

  const handleRedo = () => {
    console.log('다시 실행 버튼 클릭됨');
    onRedo();
  };

  return (
    <div className="border rounded-md p-4 bg-white shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">작업 기록</h3>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleUndo}
            disabled={!canUndo}
          >
            되돌리기
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRedo}
            disabled={!canRedo}
          >
            다시 실행
          </Button>
        </div>
      </div>
      
      <ScrollArea className="h-[300px]">
        <div className="space-y-2">
          {!historyItems || historyItems.length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              작업 기록이 없습니다.
            </div>
          ) : (
            historyItems.map((item, index) => (
              <div 
                key={item.id}
                className="p-3 border rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onJumpTo(item.id)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{item.description}</div>
                    <div className="text-sm text-gray-500">
                      {formatDistanceToNow(item.timestamp, { addSuffix: true, locale: ko })}
                    </div>
                  </div>
                  <div className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {item.data.length}개 상품
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