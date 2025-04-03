import { Product } from '@/app/types/cart';

/**
 * 이펙트 타입
 */
export type EffectType = 
  | 'PRICE_CHANGE' 
  | 'DISCOUNT_CHANGE' 
  | 'COUPON_CHANGE' 
  | 'LOGISTICS_CHANGE' 
  | 'COST_CHANGE' 
  | 'COMMISSION_CHANGE' 
  | 'STOCK_CHANGE' 
  | 'PRODUCT_ADD' 
  | 'PRODUCT_REMOVE' 
  | 'PRODUCT_REORDER' 
  | 'CHANNEL_CHANGE' 
  | 'DELIVERY_TYPE_CHANGE' 
  | 'DATE_CHANGE' 
  | 'MEMO_CHANGE' 
  | 'COLOR_CHANGE' 
  | 'DIVIDER_CHANGE';

/**
 * 이펙트 항목 타입
 */
export interface EffectItem {
  id: string;
  type: EffectType;
  productIds: string[];
  timestamp: number;
  description: string;
  data: any;
}

/**
 * 이펙트맵 관리 클래스
 */
export class EffectMapManager {
  private effects: EffectItem[] = [];
  private maxEffectsSize: number = 100;

  /**
   * 이펙트맵 관리자 생성
   * @param maxEffectsSize 최대 이펙트 크기
   */
  constructor(maxEffectsSize: number = 100) {
    this.maxEffectsSize = maxEffectsSize;
  }

  /**
   * 이펙트 추가
   * @param type 이펙트 타입
   * @param productIds 영향받는 상품 ID 목록
   * @param description 이펙트 설명
   * @param data 이펙트 데이터
   */
  addEffect(
    type: EffectType, 
    productIds: string[], 
    description: string, 
    data: any = {}
  ): void {
    console.log('EffectMapManager addEffect 호출됨:', {
      type,
      productIds,
      description,
      effectsCount: this.effects.length
    });
    
    const newEffect: EffectItem = {
      id: this.generateId(),
      type,
      productIds,
      timestamp: Date.now(),
      description,
      data
    };

    this.effects.push(newEffect);

    // 최대 이펙트 크기 초과 시 오래된 항목 제거
    if (this.effects.length > this.maxEffectsSize) {
      this.effects.shift();
    }
    
    console.log('EffectMapManager addEffect 완료:', {
      newEffectsCount: this.effects.length
    });
  }

  /**
   * 특정 상품에 영향을 준 이펙트 목록 가져오기
   * @param productId 상품 ID
   * @returns 이펙트 목록
   */
  getEffectsByProductId(productId: string): EffectItem[] {
    return this.effects.filter(effect => 
      effect.productIds.includes(productId)
    );
  }

  /**
   * 특정 타입의 이펙트 목록 가져오기
   * @param type 이펙트 타입
   * @returns 이펙트 목록
   */
  getEffectsByType(type: EffectType): EffectItem[] {
    return this.effects.filter(effect => effect.type === type);
  }

  /**
   * 특정 시간 범위의 이펙트 목록 가져오기
   * @param startTime 시작 시간
   * @param endTime 종료 시간
   * @returns 이펙트 목록
   */
  getEffectsByTimeRange(startTime: number, endTime: number): EffectItem[] {
    return this.effects.filter(effect => 
      effect.timestamp >= startTime && effect.timestamp <= endTime
    );
  }

  /**
   * 이펙트 목록 가져오기
   * @returns 이펙트 목록
   */
  getAllEffects(): EffectItem[] {
    return this.effects;
  }

  /**
   * 이펙트맵 초기화
   */
  reset(): void {
    this.effects = [];
  }

  /**
   * 이펙트 맵 업데이트
   * @param products 현재 상품 목록
   */
  updateEffects(products: Product[]): void {
    // 현재 상품 목록에 없는 상품 ID를 가진 이펙트 제거
    const productIds = products.map(product => product.product_id);
    
    console.log('EffectMapManager updateEffects:', {
      productsCount: products.length,
      productIds,
      effectsCount: this.effects.length
    });
    
    // 현재 상품 목록에 없는 상품 ID를 가진 이펙트 제거
    const filteredEffects = this.effects.filter(effect => 
      effect.productIds.some(id => productIds.includes(id))
    );
    
    // 제거된 이펙트 수 계산
    const removedCount = this.effects.length - filteredEffects.length;
    
    // 이펙트 목록 업데이트
    this.effects = filteredEffects;
    
    console.log('EffectMapManager updateEffects 완료:', {
      remainingEffectsCount: this.effects.length,
      removedEffectsCount: removedCount
    });
  }

  /**
   * ID 생성
   * @returns 생성된 ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
} 