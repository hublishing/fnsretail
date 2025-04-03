import { Product } from '@/app/types/cart';
import { HistoryManager, HistoryItem } from '../history';
import { EffectMapManager, EffectItem, EffectType } from '../effect-map';

/**
 * 되돌리기 관리 클래스
 */
export class UndoManager {
  private historyManager: HistoryManager<Product[]>;
  private effectMapManager: EffectMapManager;
  private onStateChange: (products: Product[]) => void;
  private currentProducts: Product[];

  /**
   * 되돌리기 관리자 생성
   * @param onStateChange 상태 변경 콜백 함수
   * @param maxHistorySize 최대 히스토리 크기
   * @param maxEffectsSize 최대 이펙트 크기
   */
  constructor(
    onStateChange: (products: Product[]) => void,
    maxHistorySize: number = 50,
    maxEffectsSize: number = 100
  ) {
    this.historyManager = new HistoryManager<Product[]>(maxHistorySize);
    this.effectMapManager = new EffectMapManager(maxEffectsSize);
    this.onStateChange = onStateChange;
    this.currentProducts = [];
  }

  /**
   * 초기화
   * @param products 초기 상품 목록
   */
  initialize(products: Product[]): void {
    console.log('UndoManager initialize 호출됨:', {
      productsLength: products?.length ?? 0,
      products: products?.map(p => ({
        id: p.id,
        discountType: p.discountType,
        discountValue: p.discountValue,
        discountPrice: p.discountPrice,
        couponType: p.couponType,
        couponValue: p.couponValue,
        couponPrice: p.couponPrice,
        price: p.price,
        totalPrice: p.totalPrice
      }))
    });
    
    // products 배열이 undefined이거나 비어있는 경우 빈 배열로 초기화
    if (!products || products.length === 0) {
      console.log('UndoManager initialize: products 배열이 비어있어 빈 배열로 초기화');
      products = [];
    }
    
    // 깊은 복사를 통해 products 배열 복사
    const productsCopy = JSON.parse(JSON.stringify(products));
    console.log('UndoManager initialize: 깊은 복사 완료', {
      productsCopyLength: productsCopy.length
    });
    
    // 현재 상품 목록 업데이트
    this.currentProducts = productsCopy;
    console.log('UndoManager initialize: 현재 상품 목록 업데이트 완료');
    
    // 히스토리 초기화
    this.historyManager.reset(productsCopy);
    console.log('UndoManager initialize: 히스토리 초기화 완료', {
      historyLength: this.historyManager.getHistoryItems().length,
      currentIndex: this.historyManager.getCurrentIndex()
    });
    
    // 효과 맵 초기화
    this.effectMapManager.reset();
    console.log('UndoManager initialize: 효과 맵 초기화 완료');
    
    // 상태 변경 콜백 호출
    if (this.onStateChange) {
      this.onStateChange(productsCopy);
      console.log('UndoManager initialize: 상태 변경 콜백 호출 완료');
    }
  }

  /**
   * 상태 변경을 기록
   * @param effectType 효과 타입
   * @param productIds 상품 ID 목록
   * @param description 설명
   * @param effectData 효과 데이터
   */
  public recordChange(
    effectType: EffectType,
    productIds: string[],
    description: string,
    effectData?: any
  ): void {
    console.log('UndoManager recordChange 호출됨:', {
      effectType,
      productIds,
      description,
      effectData,
      productsLength: this.currentProducts.length
    });
    
    // products 배열이 undefined이거나 비어있는 경우 빈 배열로 초기화
    if (!this.currentProducts || this.currentProducts.length === 0) {
      console.log('UndoManager recordChange: products 배열이 비어있어 빈 배열로 초기화');
      this.currentProducts = [];
    }
    
    // 현재 상태와 새로운 상태 비교
    const currentState = this.historyManager.getCurrentState();
    const newState = JSON.parse(JSON.stringify(this.currentProducts));
    
    console.log('UndoManager recordChange: 상태 비교', {
      currentStateExists: !!currentState,
      currentStateLength: currentState ? currentState.length : 0,
      newStateLength: newState.length
    });
    
    // 할인 변경인 경우 항상 상태 변경으로 간주
    const isDiscountChange = effectType === 'DISCOUNT_CHANGE' || description.includes('할인');
    
    // 상태 변경 감지
    const hasChanged = isDiscountChange || this.hasStateChanged(currentState, newState);
    console.log('UndoManager recordChange: 상태 변경 감지 결과:', hasChanged);
    
    if (hasChanged) {
      // 새로운 상태를 히스토리에 추가
      this.historyManager.push(newState, description);
      console.log('UndoManager recordChange: 새로운 상태가 히스토리에 추가됨');
      
      // 효과 맵 업데이트
      this.effectMapManager.addEffect(effectType, productIds, description, effectData);
      console.log('UndoManager recordChange: 효과 맵 업데이트됨', {
        currentIndex: this.historyManager.getCurrentIndex(),
        effectType,
        productIds,
        description,
        effectData
      });
      
      // 상태 변경 콜백 호출
      if (this.onStateChange) {
        this.onStateChange(newState);
        console.log('UndoManager recordChange: 상태 변경 콜백 호출됨');
      }
    } else {
      console.log('UndoManager recordChange: 상태 변경이 없어 기록하지 않음');
    }
  }

  /**
   * 상태 변경 여부 확인
   * @param currentState 현재 상태
   * @param newState 새로운 상태
   * @returns 상태 변경 여부
   */
  private hasStateChanged(currentState: Product[] | null, newState: Product[]): boolean {
    console.log('UndoManager hasStateChanged 호출됨:', {
      currentStateExists: !!currentState,
      currentStateLength: currentState ? currentState.length : 0,
      newStateLength: newState.length
    });
    
    // 현재 상태가 없는 경우 변경으로 간주
    if (!currentState) {
      console.log('UndoManager hasStateChanged: 현재 상태가 없어 변경으로 간주');
      return true;
    }
    
    // 배열 길이가 다른 경우 변경으로 간주
    if (currentState.length !== newState.length) {
      console.log('UndoManager hasStateChanged: 배열 길이가 다름', {
        currentStateLength: currentState.length,
        newStateLength: newState.length
      });
      return true;
    }
    
    // 각 상품의 필드 비교
    for (let i = 0; i < currentState.length; i++) {
      const currentProduct = currentState[i];
      const newProduct = newState[i];
      
      // ID가 다른 경우 변경으로 간주
      if (currentProduct.id !== newProduct.id) {
        console.log('UndoManager hasStateChanged: 상품 ID가 다름', {
          index: i,
          currentId: currentProduct.id,
          newId: newProduct.id
        });
        return true;
      }
      
      // 할인 관련 필드 비교
      const discountFields = [
        'discount_price',
        'discount',
        'discount_rate',
        'discount_unit',
        'coupon_price_1',
        'coupon_price_2',
        'coupon_price_3',
        'self_burden_1',
        'self_burden_2',
        'self_burden_3',
        'discount_burden_amount',
        'pricing_price',
        'shop_price',
        'total_price'
      ];
      
      for (const field of discountFields) {
        const currentValue = currentProduct[field as keyof Product];
        const newValue = newProduct[field as keyof Product];
        
        // null 또는 undefined 값 처리
        if ((currentValue === null || currentValue === undefined) && 
            (newValue === null || newValue === undefined)) {
          continue;
        }
        
        // 값이 다른 경우 변경으로 간주
        if (currentValue !== newValue) {
          console.log('UndoManager hasStateChanged: 필드가 다름', {
            index: i,
            field,
            currentValue,
            newValue
          });
          return true;
        }
      }
    }
    
    console.log('UndoManager hasStateChanged: 상태 변경 없음');
    return false;
  }

  /**
   * 되돌리기
   * @returns 되돌리기 성공 여부
   */
  undo(): boolean {
    console.log('UndoManager undo 호출됨');
    
    // 되돌리기 가능 여부 확인
    if (!this.canUndo()) {
      console.log('UndoManager undo 실패: 되돌리기 불가능');
      return false;
    }
    
    // historyManager의 undo 메서드 호출
    const success = this.historyManager.undo();
    if (!success) {
      console.log('UndoManager undo 실패: 이전 상태로 되돌리기 실패');
      return false;
    }
    
    // 현재 상태 가져오기
    const currentState = this.historyManager.getCurrentState();
    if (!currentState) {
      console.log('UndoManager undo 실패: 현재 상태 없음');
      return false;
    }
    
    // products 배열 업데이트
    this.currentProducts = JSON.parse(JSON.stringify(currentState));
    
    // 상태 변경 콜백 호출
    if (this.onStateChange) {
      this.onStateChange(this.currentProducts);
    }
    
    // 이펙트 맵 업데이트
    this.effectMapManager.updateEffects(this.currentProducts);
    
    console.log('UndoManager undo 완료:', {
      currentIndex: this.historyManager.getCurrentIndex(),
      historyLength: this.historyManager.getHistoryItems().length,
      productsLength: this.currentProducts.length
    });
    
    return true;
  }

  /**
   * 다시 실행
   * @returns 다시 실행 성공 여부
   */
  redo(): boolean {
    console.log('UndoManager redo 호출됨');
    
    // 다시 실행 가능 여부 확인
    if (!this.canRedo()) {
      console.log('UndoManager redo 실패: 다시 실행 불가능');
      return false;
    }
    
    // historyManager의 redo 메서드 호출
    const success = this.historyManager.redo();
    if (!success) {
      console.log('UndoManager redo 실패: 다음 상태로 이동 실패');
      return false;
    }
    
    // 현재 상태 가져오기
    const currentState = this.historyManager.getCurrentState();
    if (!currentState) {
      console.log('UndoManager redo 실패: 현재 상태 없음');
      return false;
    }
    
    // products 배열 업데이트
    this.currentProducts = JSON.parse(JSON.stringify(currentState));
    
    // 상태 변경 콜백 호출
    if (this.onStateChange) {
      this.onStateChange(this.currentProducts);
    }
    
    // 이펙트 맵 업데이트
    this.effectMapManager.updateEffects(this.currentProducts);
    
    console.log('UndoManager redo 완료:', {
      currentIndex: this.historyManager.getCurrentIndex(),
      historyLength: this.historyManager.getHistoryItems().length,
      productsLength: this.currentProducts.length
    });
    
    return true;
  }

  /**
   * 특정 히스토리 항목으로 이동
   * @param id 히스토리 항목 ID
   * @returns 이동 성공 여부
   */
  jumpTo(id: string): boolean {
    console.log('UndoManager jumpTo 호출됨:', id);
    
    // historyManager의 jumpTo 메서드 호출
    const success = this.historyManager.jumpTo(id);
    if (!success) {
      console.log('UndoManager jumpTo 실패: 대상 상태로 이동 실패');
      return false;
    }
    
    // 현재 상태 가져오기
    const currentState = this.historyManager.getCurrentState();
    if (!currentState) {
      console.log('UndoManager jumpTo 실패: 현재 상태 없음');
      return false;
    }
    
    // products 배열 업데이트
    this.currentProducts = JSON.parse(JSON.stringify(currentState));
    
    // 상태 변경 콜백 호출
    if (this.onStateChange) {
      this.onStateChange(this.currentProducts);
    }
    
    // 이펙트 맵 업데이트
    this.effectMapManager.updateEffects(this.currentProducts);
    
    console.log('UndoManager jumpTo 완료:', {
      currentIndex: this.historyManager.getCurrentIndex(),
      historyLength: this.historyManager.getHistoryItems().length,
      productsLength: this.currentProducts.length
    });
    
    return true;
  }

  /**
   * 되돌리기 가능 여부 확인
   * @returns 되돌리기 가능 여부
   */
  canUndo(): boolean {
    console.log('UndoManager canUndo 호출됨');
    
    // 초기 상태에서는 되돌리기 불가능
    if (this.historyManager.getCurrentIndex() === 0) {
      console.log('UndoManager canUndo: 초기 상태에서는 되돌리기 불가능');
      return false;
    }
    
    // historyManager의 canUndo 메서드 호출
    const result = this.historyManager.canUndo();
    
    console.log('UndoManager canUndo 완료:', {
      result,
      currentIndex: this.historyManager.getCurrentIndex(),
      historyLength: this.historyManager.getHistoryItems().length
    });
    
    return result;
  }

  /**
   * 다시 실행 가능 여부 확인
   * @returns 다시 실행 가능 여부
   */
  canRedo(): boolean {
    console.log('UndoManager canRedo 호출됨');
    
    // 초기 상태에서는 다시 실행 불가능
    if (this.historyManager.getCurrentIndex() === 0) {
      console.log('UndoManager canRedo: 초기 상태에서는 다시 실행 불가능');
      return false;
    }
    
    // historyManager의 canRedo 메서드 호출
    const result = this.historyManager.canRedo();
    
    console.log('UndoManager canRedo 완료:', {
      result,
      currentIndex: this.historyManager.getCurrentIndex(),
      historyLength: this.historyManager.getHistoryItems().length
    });
    
    return result;
  }

  /**
   * 히스토리 항목 목록 반환
   * @returns 히스토리 항목 목록
   */
  getHistoryItems(): HistoryItem<Product[]>[] {
    console.log('UndoManager getHistoryItems 호출됨');
    
    // historyManager의 getHistoryItems 메서드 호출
    const items = this.historyManager.getHistoryItems();
    
    console.log('UndoManager getHistoryItems 완료:', {
      currentIndex: this.historyManager.getCurrentIndex(),
      historyLength: items.length
    });
    
    return items;
  }

  /**
   * 모든 이펙트 목록 반환
   * @returns 이펙트 목록
   */
  getAllEffects(): EffectItem[] {
    console.log('UndoManager getAllEffects 호출됨');
    
    // effectMapManager의 getAllEffects 메서드 호출
    const effects = this.effectMapManager.getAllEffects();
    
    console.log('UndoManager getAllEffects 완료:', {
      effectsCount: effects.length
    });
    
    return effects;
  }

  /**
   * 이펙트 타입별 이펙트 목록 반환
   * @param type 이펙트 타입
   * @returns 이펙트 목록
   */
  getEffectsByType(type: EffectType): EffectItem[] {
    console.log('UndoManager getEffectsByType 호출됨:', type);
    
    // effectMapManager의 getEffectsByType 메서드 호출
    const effects = this.effectMapManager.getEffectsByType(type);
    
    console.log('UndoManager getEffectsByType 완료:', {
      type,
      effectsCount: effects.length
    });
    
    return effects;
  }

  /**
   * 상품 ID별 이펙트 가져오기
   * @param productId 상품 ID
   * @returns 이펙트 목록
   */
  getEffectsByProductId(productId: string): EffectItem[] {
    const effects = this.effectMapManager.getEffectsByProductId(productId);
    console.log('UndoManager getEffectsByProductId:', productId, effects.length);
    return effects;
  }

  /**
   * 현재 인덱스 반환
   * @returns 현재 인덱스
   */
  getCurrentIndex(): number {
    console.log('UndoManager getCurrentIndex 호출됨');
    
    // historyManager의 getCurrentIndex 메서드 호출
    const result = this.historyManager.getCurrentIndex();
    
    console.log('UndoManager getCurrentIndex 완료:', {
      result,
      historyLength: this.historyManager.getHistoryItems().length
    });
    
    return result;
  }
} 