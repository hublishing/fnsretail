import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createPrivateKey } from 'crypto';

export const dynamic = 'force-dynamic'; // 이 API는 항상 동적으로 실행

// 캐시된 결과를 저장할 변수
let cachedResults: { 
  extra_column2: string[],
  supply_name: string[],
  exclusive2: string[],
  code30: string[],
  channel_name: string[],
  channel_category_2: string[],
  channel_category_3: string[],
  brand: string[],
  lastUpdated: number 
} | null = null;

// 캐시 유효 시간 (1시간)
const CACHE_TTL = 3600000;

export async function GET() {
  try {
    // 캐시가 유효한 경우 캐시된 결과 반환
    if (cachedResults && (Date.now() - cachedResults.lastUpdated) < CACHE_TTL) {
      return NextResponse.json(cachedResults);
    }

    // Google Cloud API 엔드포인트
    const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/queries`;
    
    // 제품 필터 옵션 쿼리 - 단순화된 쿼리로 변경
    const productFiltersQuery = `
      SELECT DISTINCT 
        supply_name,
        extra_column2,
        exclusive2,
        brand
      FROM \`third-current-410914.project_m.product_db\`
      WHERE 
        supply_name IS NOT NULL AND supply_name != '' AND
        extra_column2 IS NOT NULL AND extra_column2 != '' AND
        exclusive2 IS NOT NULL AND exclusive2 != ''
    `;

    // 브랜드 필터 옵션을 위한 별도 쿼리 추가
    const brandFiltersQuery = `
      SELECT DISTINCT 
        brand
      FROM \`third-current-410914.project_m.product_db\`
      WHERE 
        brand IS NOT NULL AND 
        brand != ''
    `;

    // 주문 필터 옵션 쿼리 - 단순화된 쿼리로 변경
    const orderFiltersQuery = `
      WITH order_data AS (
        SELECT 
          code30,
          channel_name,
          channel_category_2,
          channel_category_3,
          final_calculated_amount
        FROM \`third-current-410914.project_m.order_db\`
        WHERE 
          code30 IS NOT NULL AND code30 != '' AND
          channel_name IS NOT NULL AND channel_name != '' AND
          channel_category_2 IS NOT NULL AND channel_category_2 != '' AND
          channel_category_3 IS NOT NULL AND channel_category_3 != ''
      ),
      country_data AS (
        SELECT DISTINCT 
          code30,
          SUM(final_calculated_amount) as total_amount
        FROM order_data
        GROUP BY code30
        ORDER BY total_amount DESC
      ),
      channel_data AS (
        SELECT DISTINCT 
          channel_name,
          SUM(final_calculated_amount) as total_amount
        FROM order_data
        GROUP BY channel_name
        ORDER BY total_amount DESC
      ),
      category2_data AS (
        SELECT DISTINCT 
          channel_category_2,
          SUM(final_calculated_amount) as total_amount
        FROM order_data
        GROUP BY channel_category_2
        ORDER BY total_amount DESC
      ),
      category3_data AS (
        SELECT DISTINCT 
          channel_category_3,
          SUM(final_calculated_amount) as total_amount
        FROM order_data
        GROUP BY channel_category_3
        ORDER BY total_amount DESC
      )
      SELECT 
        'country' as type,
        code30 as value
      FROM country_data
      UNION ALL
      SELECT 
        'channel' as type,
        channel_name as value
      FROM channel_data
      UNION ALL
      SELECT 
        'category2' as type,
        channel_category_2 as value
      FROM category2_data
      UNION ALL
      SELECT 
        'category3' as type,
        channel_category_3 as value
      FROM category3_data
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

    // 제품 필터 옵션 요청
    const productResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: productFiltersQuery,
        useLegacySql: false,
      }),
    });

    const productData = await productResponse.json();

    if (!productResponse.ok) {
      throw new Error(`BigQuery API 요청 실패: ${JSON.stringify(productData)}`);
    }

    // 브랜드 필터 옵션 요청 추가
    const brandResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: brandFiltersQuery,
        useLegacySql: false,
      }),
    });

    const brandData = await brandResponse.json();

    if (!brandResponse.ok) {
      throw new Error(`BigQuery API 요청 실패: ${JSON.stringify(brandData)}`);
    }

    // 주문 필터 옵션 요청
    const orderResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: orderFiltersQuery,
        useLegacySql: false,
      }),
    });

    const orderData = await orderResponse.json();

    if (!orderResponse.ok) {
      throw new Error(`BigQuery API 요청 실패: ${JSON.stringify(orderData)}`);
    }

    // 데이터 추출
    const supply_name = new Set<string>();
    const extra_column2 = new Set<string>();
    const exclusive2 = new Set<string>();
    const code30 = new Set<string>();
    const channel_name = new Set<string>();
    const channel_category_2 = new Set<string>();
    const channel_category_3 = new Set<string>();
    const brand = new Set<string>();

    // 제품 필터 옵션 추출
    productData.rows?.forEach((row: any) => {
      const supplyName = row.f[0].v;
      const extraColumn2 = row.f[1].v;
      const exclusive = row.f[2].v;
      const brandName = row.f[3].v;
      
      if (supplyName && supplyName !== 'NaN' && supplyName !== 'nan' && supplyName !== 'undefined' && supplyName !== 'null') {
        supply_name.add(supplyName);
      }
      if (extraColumn2 && extraColumn2 !== 'NaN' && extraColumn2 !== 'nan' && extraColumn2 !== 'undefined' && extraColumn2 !== 'null') {
        extra_column2.add(extraColumn2);
      }
      if (exclusive && exclusive !== 'NaN' && exclusive !== 'nan' && exclusive !== 'undefined' && exclusive !== 'null') {
        exclusive2.add(exclusive);
      }
      if (brandName && brandName !== 'NaN' && brandName !== 'nan' && brandName !== 'undefined' && brandName !== 'null') {
        brand.add(brandName);
      }
    });

    // 브랜드 필터 옵션 추출
    brandData.rows?.forEach((row: any) => {
      const brandName = row.f[0].v;
      
      if (brandName && brandName !== 'NaN' && brandName !== 'nan' && brandName !== 'undefined' && brandName !== 'null') {
        brand.add(brandName);
      }
    });

    // 주문 필터 옵션 추출
    orderData.rows?.forEach((row: any) => {
      const type = row.f[0].v;
      const value = row.f[1].v;
      
      if (value && value !== 'NaN' && value !== 'nan' && value !== 'undefined' && value !== 'null') {
        if (type === 'country') {
          code30.add(value);
        } else if (type === 'channel') {
          channel_name.add(value);
        } else if (type === 'category2') {
          channel_category_2.add(value);
        } else if (type === 'category3') {
          channel_category_3.add(value);
        }
      }
    });

    // 결과 캐싱 및 반환
    cachedResults = {
      supply_name: Array.from(supply_name),
      extra_column2: Array.from(extra_column2),
      exclusive2: Array.from(exclusive2),
      code30: Array.from(code30),
      channel_name: Array.from(channel_name),
      channel_category_2: Array.from(channel_category_2),
      channel_category_3: Array.from(channel_category_3),
      brand: Array.from(brand),
      lastUpdated: Date.now()
    };

    return NextResponse.json(cachedResults);
  } catch (error) {
    console.error('필터 옵션 조회 오류:', error);
    
    // 에러 발생 시 캐시된 결과가 있다면 반환
    if (cachedResults) {
      return NextResponse.json(cachedResults);
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : '필터 옵션 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 