export interface Channel {
  channel_name: string;
  channel_name_2?: string;
  shop_id?: string;
  shop_name?: string;
  team?: string;
  manager?: string;
  type?: string;
  use_yn?: string;
  used?: string;
  currency?: string;
  currency_2?: string;
  applied_exchange_rate?: number;
  correction_rate?: number;
  commission_rate?: number;
  average_fee_rate?: number;
  markup_ratio?: number;
  min_price?: number;
  price_formula?: string;
  rounddown?: string;
  shipping_fee?: number;
  shipping_formula?: string;
  shipping_condition?: string;
  conditional_shipping?: string;
  free_shipping?: string;
  delivery_fee?: number;
  domestic_delivery_fee?: number;
  customs_fee?: number;
  declaration_fee?: number;
  innerbox_fee?: number;
  outerbox_fee?: number;
  packingbox_fee?: number;
  digit_adjustment?: number;
  amazon_shipping_cost?: number;
  channel_category_2?: string;
  channel_category_3?: string;
  comment?: string;
}

export interface Log {
  user_id: string;
  date: string;
  channel_name: string;
  product_id: string;
  channel_product_id: string;
} 