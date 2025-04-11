import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ChannelInfo } from '@/app/types/cart';
import { debounce } from 'lodash-es';

interface AutoSaveData {
  title: string;
  channel_name_2: string;
  delivery_type: string;
  start_date: string;
  end_date: string;
  memo1: string;
  memo2: string;
  memo3: string;
  fee_discount: boolean;
  productIds: string[];
  selectedChannelInfo: ChannelInfo | null;
  immediateDiscount?: {
    discountType: string;
    discountValue: number;
    unitType: string;
    appliedProducts: string[];
    updatedAt: string;
  };
  coupon1Discount?: {
    product_id: string;
    hurdleTarget: string;
    hurdleAmount: number;
    discountBase: string;
    discountType: string;
    discountValue: number;
    roundUnit: string;
    roundType: string;
    discountCap: number;
    selfRatio: number;
  }[];
  coupon2Discount?: {
    product_id: string;
    hurdleTarget: string;
    hurdleAmount: number;
    discountBase: string;
    discountType: string;
    discountValue: number;
    roundUnit: string;
    roundType: string;
    discountCap: number;
    selfRatio: number;
  }[];
  coupon3Discount?: {
    product_id: string;
    hurdleTarget: string;
    hurdleAmount: number;
    discountBase: string;
    discountType: string;
    discountValue: number;
    roundUnit: string;
    roundType: string;
    discountCap: number;
    selfRatio: number;
  }[];
}

interface User {
  uid: string;
  email?: string;
}

export const useAutoSave = (data: AutoSaveData, currentUser: User | null) => {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const prevDataRef = useRef(data);

  const saveToFirestore = useCallback(async () => {
    if (!currentUser?.uid) return;

    try {
      setIsSaving(true);
      const cartRef = doc(db, 'userCarts', currentUser.uid);
      
      // undefined 값을 가진 필드 제거
      const cleanData = Object.entries(data).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>);

      await setDoc(cartRef, {
        ...cleanData,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving to Firestore:', error);
    } finally {
      setIsSaving(false);
    }
  }, [data, currentUser]);

  // 디바운스된 저장 함수 생성 (1초)
  const debouncedSave = useCallback(
    debounce(saveToFirestore, 1000),
    [saveToFirestore]
  );

  // 데이터가 변경될 때마다 자동 저장
  useEffect(() => {
    // immediateDiscount 필드에서 updatedAt을 제외하고 비교
    const compareImmediateDiscount = (prev: any, curr: any) => {
      if (!prev && !curr) return true;
      if (!prev || !curr) return false;
      
      return (
        prev.discountType === curr.discountType &&
        prev.discountValue === curr.discountValue &&
        prev.unitType === curr.unitType &&
        JSON.stringify(prev.appliedProducts) === JSON.stringify(curr.appliedProducts)
      );
    };
    
    // immediateDiscount 필드가 실제로 변경되었는지 확인 (updatedAt 제외)
    const immediateDiscountChanged = !compareImmediateDiscount(
      prevDataRef.current.immediateDiscount,
      data.immediateDiscount
    );
    
    // 다른 필드가 변경되었는지 확인
    const otherFieldsChanged = 
      JSON.stringify({
        ...prevDataRef.current,
        immediateDiscount: undefined
      }) !== 
      JSON.stringify({
        ...data,
        immediateDiscount: undefined
      });
    
    if (currentUser?.uid && (immediateDiscountChanged || otherFieldsChanged)) {
      console.log('데이터 변경 감지, 저장 시작', {
        immediateDiscountChanged,
        otherFieldsChanged
      });
      debouncedSave();
      prevDataRef.current = data;
    }
    
    return () => {
      debouncedSave.cancel();
    };
  }, [data, currentUser, debouncedSave]);

  return {
    isSaving,
    lastSaved,
    saveToFirestore, // 수동 저장이 필요한 경우를 위한 함수
  };
};

const saveToFirebase = async (data: AutoSaveData, user: User | null) => {
  if (!user) return;

  try {
    console.log('=== Firebase 저장 시작 ===');
    console.log('저장할 데이터:', JSON.stringify(data, null, 2));
    
    // undefined 값이 있는지 확인
    const hasUndefined = Object.entries(data).some(([key, value]) => {
      if (value === undefined) {
        console.error(`undefined 값 발견: ${key}`);
        return true;
      }
      if (typeof value === 'object' && value !== null) {
        const hasNestedUndefined = Object.entries(value).some(([nestedKey, nestedValue]) => {
          if (nestedValue === undefined) {
            console.error(`중첩된 undefined 값 발견: ${key}.${nestedKey}`);
            return true;
          }
          return false;
        });
        if (hasNestedUndefined) return true;
      }
      return false;
    });

    if (hasUndefined) {
      console.error('undefined 값이 포함된 데이터는 저장할 수 없습니다.');
      return;
    }

    // undefined 값을 제거한 깨끗한 데이터 생성
    const cleanData = Object.entries(data).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        if (typeof value === 'object' && value !== null) {
          const cleanNestedData = Object.entries(value).reduce((nestedAcc, [nestedKey, nestedValue]) => {
            if (nestedValue !== undefined) {
              nestedAcc[nestedKey] = nestedValue;
            }
            return nestedAcc;
          }, {} as Record<string, any>);
          acc[key] = cleanNestedData;
        } else {
          acc[key] = value;
        }
      }
      return acc;
    }, {} as Record<string, any>);

    console.log('정제된 데이터:', JSON.stringify(cleanData, null, 2));

    const docRef = doc(db, 'userCarts', user.uid);
    await setDoc(docRef, {
      ...cleanData,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    console.log('Firebase 저장 성공');
  } catch (error) {
    console.error('Firebase 저장 실패:', error);
    if (error instanceof Error) {
      console.error('에러 메시지:', error.message);
      console.error('에러 스택:', error.stack);
    }
  }
}; 