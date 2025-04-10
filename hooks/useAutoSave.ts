import { useState, useEffect, useCallback } from 'react';
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
    if (currentUser?.uid) {
      debouncedSave();
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
    // undefined 값을 가진 필드 제거
    const cleanData = Object.entries(data).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);

    await setDoc(doc(db, 'userCarts', user.uid), cleanData, { merge: true });
  } catch (error) {
    console.error('할인 정보 파이어베이스 저장 실패:', error);
  }
}; 