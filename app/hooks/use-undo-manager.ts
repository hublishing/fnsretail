import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Product } from '@/app/types/cart';
import { UndoManager } from '@/app/utils/undo-manager';
import { EffectType, EffectItem } from '@/app/utils/effect-map';
import { HistoryItem } from '@/app/utils/history';

/**
 * 되돌리기 기능을 사용하기 위한 훅
 * @param initialProducts 초기 상품 목록
 * @returns 되돌리기 관련 함수와 상태
 */
export function useUndoManager(initialProducts: Product[]) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const undoManagerRef = useRef<UndoManager | null>(null);
  const [filteredEffects, setFilteredEffects] = useState<EffectItem[]>([]);
  const [selectedEffectType, setSelectedEffectType] = useState<EffectType | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<HistoryItem<Product[]>[]>([]);

  // UndoManager 초기화
  useEffect(() => {
    if (!undoManagerRef.current) {
      undoManagerRef.current = new UndoManager(setProducts);
      undoManagerRef.current.initialize(initialProducts);
    }
  }, []);

  // 히스토리 항목 업데이트
  useEffect(() => {
    if (undoManagerRef.current) {
      const items = undoManagerRef.current.getHistoryItems();
      setHistoryItems(items);
    }
  }, [products]);

  // 이펙트 목록 업데이트
  useEffect(() => {
    if (undoManagerRef.current) {
      let newEffects: EffectItem[];
      if (selectedEffectType) {
        newEffects = undoManagerRef.current.getEffectsByType(selectedEffectType);
      } else if (selectedProductId) {
        newEffects = undoManagerRef.current.getEffectsByProductId(selectedProductId);
      } else {
        newEffects = undoManagerRef.current.getAllEffects();
      }
      setFilteredEffects(newEffects);
    }
  }, [selectedEffectType, selectedProductId, products]);

  const recordChange = useCallback((
    updatedProducts: Product[],
    effectType: EffectType,
    productIds: string[],
    description: string,
    effectData: any = {}
  ) => {
    if (undoManagerRef.current) {
      setProducts(updatedProducts);
      undoManagerRef.current.recordChange(effectType, productIds, description, effectData);
    }
  }, []);

  const undo = useCallback(() => {
    if (undoManagerRef.current) {
      const success = undoManagerRef.current.undo();
      if (success) {
        // undo 성공 시 히스토리 항목 업데이트
        const items = undoManagerRef.current.getHistoryItems();
        setHistoryItems(items);
        
        // 현재 인덱스에 해당하는 항목 찾기
        const currentIndex = undoManagerRef.current.getCurrentIndex();
        if (currentIndex >= 0 && currentIndex < items.length) {
          setProducts(items[currentIndex].data);
        }
      }
    }
  }, []);

  const redo = useCallback(() => {
    if (undoManagerRef.current) {
      const success = undoManagerRef.current.redo();
      if (success) {
        // redo 성공 시 히스토리 항목 업데이트
        const items = undoManagerRef.current.getHistoryItems();
        setHistoryItems(items);
        
        // 현재 인덱스에 해당하는 항목 찾기
        const currentIndex = undoManagerRef.current.getCurrentIndex();
        if (currentIndex >= 0 && currentIndex < items.length) {
          setProducts(items[currentIndex].data);
        }
      }
    }
  }, []);

  const jumpTo = useCallback((id: string) => {
    if (undoManagerRef.current) {
      undoManagerRef.current.jumpTo(id);
    }
  }, []);

  const filterByType = useCallback((type: EffectType | null) => {
    setSelectedEffectType(type);
    setSelectedProductId(null);
  }, []);

  const filterByProductId = useCallback((productId: string | null) => {
    setSelectedProductId(productId);
  }, []);

  const canUndo = useMemo(() => {
    return undoManagerRef.current?.canUndo() ?? false;
  }, [products]);

  const canRedo = useMemo(() => {
    return undoManagerRef.current?.canRedo() ?? false;
  }, [products]);

  return {
    products,
    setProducts,
    recordChange,
    undo,
    redo,
    jumpTo,
    filterByType,
    filterByProductId,
    canUndo,
    canRedo,
    historyItems,
    effects: filteredEffects
  };
} 