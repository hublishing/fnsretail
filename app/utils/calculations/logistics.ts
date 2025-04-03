import { ChannelInfo } from '@/app/types/cart';
import { parseChannelBasicInfo } from './common';

/**
 * 물류비 계산
 * @param channel 채널 정보
 * @param deliveryType 배송 유형 (free/conditional)
 * @param amazonShippingCost 아마존 배송비 (선택)
 * @returns 계산된 물류비
 */
export const calculateLogisticsCost = (
  channel: ChannelInfo,
  deliveryType: string,
  amazonShippingCost?: number
): number => {
  const { exchangeRate, freeShipping, conditionalShipping } = parseChannelBasicInfo(channel);
  
  // 아마존 US 특별 케이스
  if (channel.channel_name_2 === 'SG_아마존US') {
    if (deliveryType === 'free') {
      return (amazonShippingCost || 0) * 2;
    }
    return amazonShippingCost || 0;
  }
  
  // 일반 무료배송
  if (deliveryType === 'free') {
    return exchangeRate > 0 ? freeShipping / exchangeRate : 0;
  }
  
  // 일반 조건부배송
  return exchangeRate > 0 ? conditionalShipping / exchangeRate : 0;
}; 