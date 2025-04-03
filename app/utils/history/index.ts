import { Product } from '@/app/types/cart';

/**
 * 히스토리 항목 타입
 */
export interface HistoryItem<T> {
  id: string;
  timestamp: number;
  data: T;
  description: string;
}

/**
 * 히스토리 관리 클래스
 */
export class HistoryManager<T> {
  private history: HistoryItem<T>[] = [];
  private currentIndex: number = -1;
  private maxHistorySize: number = 50;

  /**
   * 히스토리 관리자 생성
   * @param maxHistorySize 최대 히스토리 크기
   */
  constructor(maxHistorySize: number = 50) {
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * 현재 상태를 히스토리에 추가
   * @param data 현재 상태 데이터
   * @param description 히스토리 항목 설명
   */
  push(data: T, description: string): void {
    console.log('HistoryManager push 호출됨:', {
      description,
      dataLength: Array.isArray(data) ? data.length : 'not array',
      currentIndex: this.currentIndex,
      historyLength: this.history.length
    });
    
    // 현재 위치 이후의 히스토리 항목 제거
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
      console.log('HistoryManager push: 현재 위치 이후 히스토리 항목 제거', {
        newHistoryLength: this.history.length,
        newCurrentIndex: this.currentIndex
      });
    }

    // 새 히스토리 항목 추가
    const newItem: HistoryItem<T> = {
      id: this.generateId(),
      timestamp: Date.now(),
      data: this.cloneData(data),
      description
    };

    // 현재 상태와 새 상태가 다른 경우에만 히스토리에 추가
    const currentState = this.getCurrentState();
    
    // 할인 적용인 경우 항상 상태 변경으로 간주
    const isDiscountChange = description.includes('할인 적용') || description.includes('할인 변경');
    
    // 상태 비교 로직 활성화
    if (!currentState || isDiscountChange || !this.areEqual(currentState, data)) {
      this.history.push(newItem);
      this.currentIndex = this.history.length - 1;

      // 최대 히스토리 크기 초과 시 오래된 항목 제거
      if (this.history.length > this.maxHistorySize) {
        this.history.shift();
        this.currentIndex--;
        console.log('HistoryManager push: 최대 히스토리 크기 초과로 오래된 항목 제거', {
          newHistoryLength: this.history.length,
          newCurrentIndex: this.currentIndex
        });
      }
      
      console.log('HistoryManager push 완료: 상태 변경 감지됨', {
        newIndex: this.currentIndex,
        newHistoryLength: this.history.length,
        isDiscountChange,
        description
      });
    } else {
      console.log('HistoryManager push 완료: 상태 변경 없음, 기록하지 않음', {
        isDiscountChange,
        description,
        currentStateLength: currentState ? (Array.isArray(currentState) ? currentState.length : 'not array') : 'null',
        newStateLength: Array.isArray(data) ? data.length : 'not array'
      });
    }
  }

  /**
   * 되돌리기
   * @returns 이전 상태
   */
  undo(): boolean {
    console.log('HistoryManager undo 호출됨:', {
      currentIndex: this.currentIndex,
      historyLength: this.history.length
    });
    
    // 되돌리기 가능 여부 확인
    if (!this.canUndo()) {
      console.log('HistoryManager undo 실패: 되돌리기 불가능');
      return false;
    }
    
    // 현재 인덱스 감소
    this.currentIndex--;
    
    console.log('HistoryManager undo 완료:', {
      newIndex: this.currentIndex,
      historyLength: this.history.length
    });
    
    return true;
  }

  /**
   * 다음 상태로 진행
   * @returns 다음 상태 데이터 또는 null
   */
  redo(): boolean {
    console.log('HistoryManager redo 호출됨:', {
      currentIndex: this.currentIndex,
      historyLength: this.history.length
    });
    
    // 다시 실행 가능 여부 확인
    if (!this.canRedo()) {
      console.log('HistoryManager redo 실패: 다시 실행 불가능');
      return false;
    }
    
    // 현재 인덱스 증가
    this.currentIndex++;
    
    console.log('HistoryManager redo 완료:', {
      newIndex: this.currentIndex,
      historyLength: this.history.length
    });
    
    return true;
  }

  /**
   * 현재 상태 가져오기
   * @returns 현재 상태 데이터 또는 null
   */
  getCurrentState(): T | null {
    console.log('HistoryManager getCurrentState 호출됨:', {
      currentIndex: this.currentIndex,
      historyLength: this.history.length
    });
    
    // 현재 인덱스가 유효하지 않으면 null 반환
    if (this.currentIndex < 0 || this.currentIndex >= this.history.length) {
      console.log('HistoryManager getCurrentState: 현재 인덱스가 유효하지 않음');
      return null;
    }
    
    // 현재 상태 복사하여 반환
    const currentState = this.cloneData(this.history[this.currentIndex].data);
    
    console.log('HistoryManager getCurrentState 완료:', {
      currentIndex: this.currentIndex,
      historyLength: this.history.length,
      stateExists: !!currentState
    });
    
    return currentState;
  }

  /**
   * 되돌리기 가능 여부 확인
   * @returns 되돌리기 가능 여부
   */
  canUndo(): boolean {
    console.log('HistoryManager canUndo 호출됨:', {
      currentIndex: this.currentIndex,
      historyLength: this.history.length
    });
    
    // 히스토리가 비어있으면 되돌리기 불가능
    if (this.history.length === 0) {
      console.log('HistoryManager canUndo 완료: 히스토리 비어있음');
      return false;
    }
    
    // 현재 인덱스가 0 이하면 되돌리기 불가능
    if (this.currentIndex <= 0) {
      console.log('HistoryManager canUndo 완료: 현재 인덱스 0 이하');
      return false;
    }
    
    console.log('HistoryManager canUndo 완료: 되돌리기 가능');
    return true;
  }

  /**
   * 다시 실행 가능 여부 확인
   * @returns 다시 실행 가능 여부
   */
  canRedo(): boolean {
    console.log('HistoryManager canRedo 호출됨:', {
      currentIndex: this.currentIndex,
      historyLength: this.history.length
    });
    
    // 초기 상태에서는 다시 실행 불가능
    if (this.currentIndex === 0) {
      console.log('HistoryManager canRedo: 현재 인덱스가 초기 상태(0)');
      return false;
    }
    
    // 현재 인덱스가 마지막이면 다시 실행 불가능
    if (this.currentIndex >= this.history.length - 1) {
      console.log('HistoryManager canRedo: 현재 인덱스 마지막');
      return false;
    }
    
    console.log('HistoryManager canRedo 완료: 다시 실행 가능');
    return true;
  }

  /**
   * 히스토리 항목 목록 반환
   * @returns 히스토리 항목 목록
   */
  getHistoryItems(): HistoryItem<T>[] {
    console.log('HistoryManager getHistoryItems 호출됨:', {
      currentIndex: this.currentIndex,
      historyLength: this.history.length
    });
    
    // 히스토리가 비어있으면 빈 배열 반환
    if (this.history.length === 0) {
      console.log('HistoryManager getHistoryItems 완료: 히스토리 비어있음');
      return [];
    }
    
    // 현재 인덱스가 유효하지 않으면 빈 배열 반환
    if (this.currentIndex < 0 || this.currentIndex >= this.history.length) {
      console.log('HistoryManager getHistoryItems 완료: 현재 인덱스 유효하지 않음');
      return [];
    }
    
    console.log('HistoryManager getHistoryItems 완료:', {
      currentIndex: this.currentIndex,
      historyLength: this.history.length
    });
    
    return this.history.map((item, index) => ({
      ...item,
      isCurrent: index === this.currentIndex
    }));
  }

  /**
   * 특정 히스토리 항목으로 이동
   * @param id 히스토리 항목 ID
   * @returns 이동 성공 여부
   */
  jumpTo(id: string): boolean {
    console.log('HistoryManager jumpTo 호출됨:', {
      id,
      currentIndex: this.currentIndex,
      historyLength: this.history.length
    });
    
    // 대상 히스토리 항목 찾기
    const targetIndex = this.history.findIndex(item => item.id === id);
    if (targetIndex === -1) {
      console.log('HistoryManager jumpTo 실패: 대상 히스토리 항목 없음');
      return false;
    }
    
    // 현재 인덱스 업데이트
    this.currentIndex = targetIndex;
    
    console.log('HistoryManager jumpTo 완료:', {
      newIndex: this.currentIndex,
      historyLength: this.history.length
    });
    
    return true;
  }

  /**
   * 히스토리 초기화
   * @param initialState 초기 상태 데이터
   * @param description 초기 상태 설명
   */
  reset(initialState: T, description: string = '초기 상태'): void {
    console.log('HistoryManager reset 호출됨:', {
      description,
      dataLength: Array.isArray(initialState) ? initialState.length : 'not array'
    });
    
    this.history = [{
      id: this.generateId(),
      timestamp: Date.now(),
      data: this.cloneData(initialState),
      description
    }];
    this.currentIndex = this.history.length > 0 ? 0 : -1;
    
    console.log('HistoryManager reset 완료:', {
      historyLength: this.history.length,
      currentIndex: this.currentIndex
    });
  }

  /**
   * 고유 ID 생성
   * @returns 고유 ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  /**
   * 데이터 깊은 복사
   * @param data 복사할 데이터
   * @returns 복사된 데이터
   */
  private cloneData<T>(data: T): T {
    console.log('HistoryManager cloneData 호출됨:', {
      data
    });
    
    // null 또는 undefined 체크
    if (data === null || data === undefined) {
      console.log('HistoryManager cloneData 완료: null 또는 undefined');
      return data;
    }
    
    // 기본 타입 체크
    if (typeof data !== 'object') {
      console.log('HistoryManager cloneData 완료: 기본 타입');
      return data;
    }
    
    // 배열 체크
    if (Array.isArray(data)) {
      console.log('HistoryManager cloneData 완료: 배열');
      return data.map(item => this.cloneData(item)) as unknown as T;
    }
    
    // 객체 체크
    console.log('HistoryManager cloneData 완료: 객체');
    return Object.fromEntries(
      Object.entries(data as Record<string, any>).map(([key, value]) => [
        key,
        this.cloneData(value)
      ])
    ) as T;
  }

  /**
   * 두 상태가 동일한지 확인
   * @param state1 첫 번째 상태
   * @param state2 두 번째 상태
   * @returns 동일 여부
   */
  private areEqual(state1: any, state2: any): boolean {
    console.log('HistoryManager areEqual 호출됨:', {
      state1Length: Array.isArray(state1) ? state1.length : 'not array',
      state2Length: Array.isArray(state2) ? state2.length : 'not array'
    });
    
    // null 또는 undefined 체크
    if (state1 === null || state1 === undefined || state2 === null || state2 === undefined) {
      console.log('HistoryManager areEqual 완료: null 또는 undefined');
      return state1 === state2;
    }
    
    // 기본 타입 체크
    if (typeof state1 !== 'object' || typeof state2 !== 'object') {
      console.log('HistoryManager areEqual 완료: 기본 타입');
      return state1 === state2;
    }
    
    // 배열 체크
    if (Array.isArray(state1) && Array.isArray(state2)) {
      // 배열 길이가 다른 경우
      if (state1.length !== state2.length) {
        console.log('HistoryManager areEqual 완료: 배열 길이 다름', {
          state1Length: state1.length,
          state2Length: state2.length
        });
        return false;
      }
      
      // 각 요소 비교
      for (let i = 0; i < state1.length; i++) {
        if (!this.areEqual(state1[i], state2[i])) {
          console.log('HistoryManager areEqual 완료: 배열 요소 다름', {
            index: i,
            state1Value: state1[i],
            state2Value: state2[i]
          });
          return false;
        }
      }
      
      console.log('HistoryManager areEqual 완료: 배열 동일');
      return true;
    }
    
    // 객체 체크
    const keys1 = Object.keys(state1);
    const keys2 = Object.keys(state2);
    
    // 키 개수가 다른 경우
    if (keys1.length !== keys2.length) {
      console.log('HistoryManager areEqual 완료: 객체 키 개수 다름', {
        keys1Length: keys1.length,
        keys2Length: keys2.length
      });
      return false;
    }
    
    // 각 키 비교
    for (const key of keys1) {
      if (!(key in state2)) {
        console.log('HistoryManager areEqual 완료: 객체 키 없음', {
          key
        });
        return false;
      }
      
      if (!this.areEqual(state1[key], state2[key])) {
        console.log('HistoryManager areEqual 완료: 객체 값 다름', {
          key,
          state1Value: state1[key],
          state2Value: state2[key]
        });
        return false;
      }
    }
    
    console.log('HistoryManager areEqual 완료: 객체 동일');
    return true;
  }

  /**
   * 두 값이 다른지 확인하는 헬퍼 메서드
   * @param value1 첫 번째 값
   * @param value2 두 번째 값
   * @returns 값이 다른지 여부
   */
  private isValueChanged(value1: any, value2: any): boolean {
    // null과 undefined 처리
    if (value1 === null && value2 === null) return false;
    if (value1 === undefined && value2 === undefined) return false;
    if (value1 === null || value2 === null) return true;
    if (value1 === undefined || value2 === undefined) return true;
    
    // 숫자 비교 (NaN 처리)
    if (typeof value1 === 'number' && typeof value2 === 'number') {
      if (isNaN(value1) && isNaN(value2)) return false;
      if (isNaN(value1) || isNaN(value2)) return true;
      return value1 !== value2;
    }
    
    // 일반 비교
    return value1 !== value2;
  }

  /**
   * 현재 인덱스 반환
   * @returns 현재 인덱스
   */
  getCurrentIndex(): number {
    console.log('HistoryManager getCurrentIndex 호출됨:', {
      currentIndex: this.currentIndex,
      historyLength: this.history.length
    });
    
    return this.currentIndex;
  }
} 