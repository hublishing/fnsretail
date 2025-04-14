import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ChannelInfo } from '@/app/types/cart';
import { debounce } from 'lodash-es';
import { useAuth } from '@/lib/auth';

type DiscountType = 'amount' | 'rate';

//interface ImmediateDiscount {
//  discountType: string;
//  discountValue: number;
//  unitType: string;
//  appliedProducts: string[];
//  updatedAt: string;
//}

interface CouponDiscount {
  product_id: string;
  hurdleTarget: string;
  hurdleAmount: number;
  discountBase: string;
  discountType: 'amount';
  discountValue: number;
  roundUnit: string;
  roundType: 'ceil';
  discountCap: number;
  selfRatio: number;
  decimalPoint: 'none';
}

interface AutoSaveData {
  title?: string;
  channel_name_2?: string;
  delivery_type?: string;
  start_date?: string;
  end_date?: string;
  memo1?: string;
  memo2?: string;
  memo3?: string;
  fee_discount?: boolean;
  productIds?: string[];
  selectedChannelInfo?: ChannelInfo;
  // immediateDiscount?: ImmediateDiscount | null;
  coupon1Discount?: CouponDiscount[];
  coupon2Discount?: CouponDiscount[];
  coupon3Discount?: CouponDiscount[];
}

interface User {
  uid: string;
  email?: string;
}

export function useAutoSave(data: AutoSaveData) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedData, setLastSavedData] = useState<AutoSaveData | null>(null);
  const { user } = useAuth();
  const userId = user?.uid;
  const prevDataRef = useRef(data);

  const saveToFirestore = async (data: AutoSaveData) => {
    if (!userId) return;
    
    try {
      setIsSaving(true);
      const cleanedData = cleanData(data);
      await setDoc(doc(db, 'userCarts', userId), cleanedData, { merge: true });
      setLastSavedData(data);
      setIsSaving(false);
    } catch (error) {
      console.error('Error saving to Firestore:', error);
      setIsSaving(false);
    }
  };

  // 디바운스된 저장 함수 생성 (1초)
  const debouncedSave = debounce(() => {
    saveToFirestore(data);
  }, 1000);

  useEffect(() => {
    const prevData = prevDataRef.current;
    const changes = {
      //immediateDiscount: compareImmediateDiscount(prevData.immediateDiscount, data.immediateDiscount),
      coupon1Discount: compareCouponDiscount(prevData.coupon1Discount || [], data.coupon1Discount || []),
      coupon2Discount: compareCouponDiscount(prevData.coupon2Discount || [], data.coupon2Discount || []),
      coupon3Discount: compareCouponDiscount(prevData.coupon3Discount || [], data.coupon3Discount || [])
    };

    const shouldSave = Object.values(changes).some(changed => changed);
    
    if (userId && shouldSave) {
      console.log('데이터 변경 감지, 저장 시작', changes);
      debouncedSave();
    }

    prevDataRef.current = data;

    return () => {
      debouncedSave.cancel();
    };
  }, [data, userId, debouncedSave]);

  return {
    isSaving,
    lastSavedData,
    saveToFirestore,
  };
}

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
      if (Array.isArray(value)) {
        return value.some(item => {
          if (item === undefined) return true;
          if (typeof item === 'object' && item !== null) {
            return Object.values(item).some(v => v === undefined);
          }
          return false;
        });
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
        if (Array.isArray(value)) {
          acc[key] = value.map(item => {
            if (typeof item === 'object' && item !== null) {
              return Object.entries(item).reduce((nestedAcc, [nestedKey, nestedValue]) => {
                if (nestedValue !== undefined) {
                  nestedAcc[nestedKey] = nestedValue;
                }
                return nestedAcc;
              }, {} as Record<string, any>);
            }
            return item;
          });
        } else if (typeof value === 'object' && value !== null) {
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

{/*
const compareImmediateDiscount = (prev: any, curr: any) => {
  if (!prev && !curr) return true;
  if (!prev || !curr) return false;
  
  const { updatedAt: prevUpdatedAt, ...prevRest } = prev;
  const { updatedAt: currUpdatedAt, ...currRest } = curr;
  
  return JSON.stringify(prevRest) === JSON.stringify(currRest);
};
*/}

const compareCouponDiscount = (prev: CouponDiscount[], current: CouponDiscount[]): boolean => {
  if (prev.length !== current.length) return true;
  
  return prev.some((prevCoupon, index) => {
    const currentCoupon = current[index];
    return (
      prevCoupon.product_id !== currentCoupon.product_id ||
      prevCoupon.hurdleTarget !== currentCoupon.hurdleTarget ||
      prevCoupon.hurdleAmount !== currentCoupon.hurdleAmount ||
      prevCoupon.discountBase !== currentCoupon.discountBase ||
      prevCoupon.discountType !== currentCoupon.discountType ||
      prevCoupon.discountValue !== currentCoupon.discountValue ||
      prevCoupon.roundUnit !== currentCoupon.roundUnit ||
      prevCoupon.roundType !== currentCoupon.roundType ||
      prevCoupon.discountCap !== currentCoupon.discountCap ||
      prevCoupon.selfRatio !== currentCoupon.selfRatio ||
      prevCoupon.decimalPoint !== currentCoupon.decimalPoint
    );
  });
};

const cleanData = (data: any): any => {
  if (Array.isArray(data)) {
    return data.map(item => cleanData(item));
  }
  if (data !== null && typeof data === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        result[key] = cleanData(value);
      }
    }
    return result;
  }
  return data;
}; 