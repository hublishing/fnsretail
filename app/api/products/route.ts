import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createPrivateKey } from 'crypto';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get('search') || '';
  const searchType = searchParams.get('type') || 'name';
  const extra_column2 = searchParams.get('extra_column2');
  const category_3 = searchParams.get('category_3');
  const drop_yn = searchParams.get('drop_yn');
  const supply_name = searchParams.get('supply_name');
  const exclusive2 = searchParams.get('exclusive2');
  
  // 주문 데이터 필터링 파라미터
  const order_date_from = searchParams.get('order_date_from');
  const order_date_to = searchParams.get('order_date_to');
  const code30 = searchParams.get('code30');
  const channel_name = searchParams.get('channel_name');
  const channel_category_2 = searchParams.get('channel_category_2');
  const channel_category_3 = searchParams.get('channel_category_3');
  const sort_by_qty = searchParams.get('sort_by_qty'); // 'asc' or 'desc' or 'default'

  // 검색어나 필터 중 하나라도 있어야 검색 실행
  const hasSearchTerm = searchTerm.trim().length > 0;
  const hasFilter = [extra_column2, category_3, drop_yn, supply_name, exclusive2, 
                     order_date_from, order_date_to, code30, channel_name, 
                     channel_category_2, channel_category_3].some(filter => filter && filter !== 'all');

  if (!hasSearchTerm && !hasFilter) {
    return NextResponse.json([]);
  }

  try {
    // Google Cloud API 엔드포인트
    const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/queries`;
    
    // WHERE 절 조건 생성
    const productConditions = [];
    const orderConditions = [];
    
    // 검색어 조건 추가
    if (searchTerm) {
      if (searchType === 'name') {
        productConditions.push(`name LIKE '%${searchTerm}%'`);
      } else {
        const productIds = searchTerm.split(',').map(id => id.trim()).filter(Boolean);
        if (productIds.length > 0) {
          productConditions.push(`product_id IN ('${productIds.join("','")}')`);
        }
      }
    }

    // 상품 필터 조건 추가
    if (extra_column2 && extra_column2 !== 'all') productConditions.push(`extra_column2 = '${extra_column2}'`);
    if (category_3 && category_3 !== 'all') productConditions.push(`category_3 = '${category_3}'`);
    if (drop_yn && drop_yn !== 'all') productConditions.push(`drop_yn = '${drop_yn}'`);
    if (supply_name && supply_name !== 'all') productConditions.push(`supply_name = '${supply_name}'`);
    if (exclusive2 && exclusive2 !== 'all') productConditions.push(`exclusive2 = '${exclusive2}'`);

    // 주문 데이터 필터 조건 추가
    if (order_date_from) orderConditions.push(`order_date >= '${order_date_from}'`);
    if (order_date_to) orderConditions.push(`order_date <= '${order_date_to}'`);
    if (code30 && code30 !== 'all') orderConditions.push(`code30 = '${code30}'`);
    if (channel_name && channel_name !== 'all') orderConditions.push(`channel_name = '${channel_name}'`);
    if (channel_category_2 && channel_category_2 !== 'all') orderConditions.push(`channel_category_2 = '${channel_category_2}'`);
    if (channel_category_3 && channel_category_3 !== 'all') orderConditions.push(`channel_category_3 = '${channel_category_3}'`);

    const productWhereClause = productConditions.length > 0 ? `WHERE ${productConditions.join(' AND ')}` : '';
    const orderWhereClause = orderConditions.length > 0 ? `WHERE ${orderConditions.join(' AND ')}` : '';
     
    const query = `
      WITH FilteredProducts AS (
        SELECT *
        FROM \`third-current-410914.project_m.product_db\`
        ${productWhereClause}
      ),
      FilteredOrders AS (
        SELECT *
        FROM \`third-current-410914.project_m.order_db\`
        ${orderWhereClause}
      ),
      StockSummary AS (
        SELECT 
          product_id,
          SUM(IFNULL(main_wh_available_stock_excl_production_stock, 0)) as total_stock
        FROM FilteredProducts
        GROUP BY product_id
      ),
      OrderSummary AS (
        SELECT 
          product_id,
          SUM(IFNULL(qty, 0)) as total_order_qty,
          ARRAY_AGG(DISTINCT order_date ORDER BY order_date DESC LIMIT 20) as recent_order_dates,
          ARRAY_AGG(DISTINCT code30 LIMIT 20) as order_countries,
          ARRAY_AGG(DISTINCT channel_name LIMIT 20) as order_channels,
          ARRAY_AGG(DISTINCT channel_category_2 LIMIT 20) as order_categories,
          ARRAY_AGG(DISTINCT channel_category_3 LIMIT 20) as order_types
        FROM FilteredOrders
        GROUP BY product_id
      ),
      RankedProducts AS (
        SELECT 
          FP.*,
          SS.total_stock,
          OS.total_order_qty,
          OS.recent_order_dates,
          OS.order_countries,
          OS.order_channels,
          OS.order_categories,
          OS.order_types,
          ROW_NUMBER() OVER (PARTITION BY FP.product_id ORDER BY FP.product_id DESC) as rn
        FROM FilteredProducts FP
        LEFT JOIN StockSummary SS ON FP.product_id = SS.product_id
        LEFT JOIN OrderSummary OS ON FP.product_id = OS.product_id
      )
      SELECT 
        product_id,
        name,
        origin,
        weight,
        org_price,
        shop_price,
        img_desc1,
        product_desc,
        category,
        extra_column1,
        extra_column2,
        options_product_id,
        options_options,
        cost_ratio,
        category_1,
        brand,
        category_3,
        global_price,
        category_group,
        amazon_shipping_cost,
        main_stock,
        add_wh_stock,
        production_stock,
        prima_stock,
        main_wh_available_stock,
        main_wh_available_stock_excl_production_stock,
        total_stock,
        incoming_stock,
        tag,
        drop_yn,
        soldout,
        soldout_rate,
        supply_name,
        scheduled,
        last_shipping,
        exclusive,
        exclusive2,
        fulfillment_stock_zalora,
        fulfillment_stock_shopee_sg,
        fulfillment_stock_shopee_my,
        total_order_qty,
        recent_order_dates,
        order_countries,
        order_channels,
        order_categories,
        order_types
      FROM RankedProducts
      WHERE rn = 1
      ${sort_by_qty && sort_by_qty !== 'default' ? `ORDER BY total_order_qty ${sort_by_qty === 'desc' ? 'DESC' : 'ASC'}, product_id DESC` : 'ORDER BY total_order_qty DESC, product_id DESC'}
    `;

    // JWT 토큰 생성
    const now = Math.floor(Date.now() / 1000);
    const privateKeyString = process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n') || '';
    
    if (!privateKeyString) {
      throw new Error('GOOGLE_CLOUD_PRIVATE_KEY 환경 변수가 설정되지 않았습니다.');
    }

    const privateKey = createPrivateKey({
      key: privateKeyString,
      format: 'pem',
    });
    
    const jwtToken = jwt.sign(
      {
        iss: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
        sub: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
        jti: Math.random().toString(),
        scope: 'https://www.googleapis.com/auth/bigquery',
      },
      privateKey,
      {
        algorithm: 'RS256',
        keyid: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
      }
    );

    // OAuth 2.0 액세스 토큰 얻기
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwtToken,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(`액세스 토큰 획득 실패: ${JSON.stringify(tokenData)}`);
    }

    const { access_token } = tokenData;

    // BigQuery API 요청
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        useLegacySql: false,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`BigQuery API 요청 실패: ${JSON.stringify(data)}`);
    }

    // BigQuery 응답에서 데이터 추출
    const rows = data.rows?.map((row: any) => {
      const values = row.f.map((field: any) => field.v);
      
      // 안전하게 BigQuery 배열 데이터 파싱하는 함수
      const safeParseArray = (value: any): string[] => {
        if (!value) return [];
        try {
          // BigQuery의 ARRAY 반환 결과는 중첩된 f와 v 구조를 가지고 있음
          if (typeof value === 'object' && value.f) {
            return value.f.map((item: any) => item.v || '');
          }
          
          // 문자열인 경우 JSON 파싱 시도
          if (typeof value === 'string') {
            try {
              const parsed = JSON.parse(value);
              if (Array.isArray(parsed)) {
                return parsed;
              }
            } catch (e) {
              // JSON 파싱 실패 시 빈 배열 반환
              console.error('JSON 파싱 실패:', e);
            }
          }
          
          // 기본값으로 빈 배열 반환
          return [];
        } catch (error) {
          console.error('배열 파싱 오류:', error);
          return [];
        }
      };
      
      return {
        product_id: values[0] || '',
        name: values[1] || '',
        origin: values[2] || '',
        weight: values[3] || '',
        org_price: Number(values[4] || 0),
        shop_price: Number(values[5] || 0),
        img_desc1: values[6] || '',
        product_desc: values[7] || '',
        category: values[8] || '',
        extra_column1: values[9] || '',
        extra_column2: values[10] || '',
        options_product_id: values[11] || '',
        options_options: values[12] || '',
        cost_ratio: Number(values[13] || 0),
        category_1: values[14] || '',
        brand: values[15] || '',
        category_3: values[16] || '',
        global_price: Number(values[17] || 0),
        category_group: values[18] || '',
        amazon_shipping_cost: Number(values[19] || 0),
        main_stock: values[20] || '',
        add_wh_stock: values[21] || '',
        production_stock: values[22] || '',
        prima_stock: values[23] || '',
        main_wh_available_stock: Number(values[24] || 0),
        main_wh_available_stock_excl_production_stock: Number(values[25] || 0),
        total_stock: Number(values[26] || 0),
        incoming_stock: values[27] || '',
        tag: values[28] || '',
        drop_yn: values[29] || '',
        soldout: values[30] || '',
        soldout_rate: Number(values[31] || 0),
        supply_name: values[32] || '',
        scheduled: values[33] || '',
        last_shipping: values[34] || '',
        exclusive: values[35] || '',
        exclusive2: values[36] || '',
        fulfillment_stock_zalora: values[37] || '',
        fulfillment_stock_shopee_sg: values[38] || '',
        fulfillment_stock_shopee_my: values[39] || '',
        total_order_qty: Number(values[40] || 0),
        recent_order_dates: safeParseArray(values[41]),
        order_countries: safeParseArray(values[42]),
        order_channels: safeParseArray(values[43]),
        order_categories: safeParseArray(values[44]),
        order_types: safeParseArray(values[45])
      };
    }) || [];

    return NextResponse.json(rows);
  } catch (error) {
    console.error('BigQuery 쿼리 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '데이터 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 