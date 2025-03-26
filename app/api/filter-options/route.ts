import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createPrivateKey } from 'crypto';

export const dynamic = 'force-dynamic'; // 이 API는 항상 동적으로 실행

// 캐시된 결과를 저장할 변수
let cachedResults: { 
  extra_column2: string[],
  supply_name: string[],
  exclusive2: string[],
  lastUpdated: number 
} | null = null;

// 캐시 유효 시간 (1시간)
const CACHE_TTL = 3600000;

export async function GET() {
  try {
    // 캐시가 유효한 경우 캐시된 결과 반환
    if (cachedResults && (Date.now() - cachedResults.lastUpdated) < CACHE_TTL) {
      return NextResponse.json({
        extra_column2: cachedResults.extra_column2,
        supply_name: cachedResults.supply_name,
        exclusive2: cachedResults.exclusive2
      });
    }

    // Google Cloud API 엔드포인트
    const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/queries`;
    
    // 제품 필터 옵션 쿼리 
    const productFiltersQuery = `
      WITH UniqueValues AS (
        SELECT DISTINCT 
          supply_name,
          extra_column2,
          exclusive2
        FROM \`third-current-410914.project_m.product_db\`
        WHERE 
          supply_name IS NOT NULL AND supply_name != '' AND
          extra_column2 IS NOT NULL AND extra_column2 != '' AND
          exclusive2 IS NOT NULL AND exclusive2 != ''
      )
      SELECT
        ARRAY_AGG(DISTINCT supply_name) as supply_name,
        ARRAY_AGG(DISTINCT extra_column2) as extra_column2,
        ARRAY_AGG(DISTINCT exclusive2) as exclusive2
      FROM UniqueValues
    `;

    // 주문 필터 옵션 쿼리
    const orderFiltersQuery = `
      WITH UniqueOrderValues AS (
        SELECT DISTINCT 
          code30,
          channel_name,
          channel_category_2,
          channel_category_3
        FROM \`third-current-410914.project_m.order_db\`
        WHERE 
          code30 IS NOT NULL AND code30 != '' AND
          channel_name IS NOT NULL AND channel_name != '' AND
          channel_category_2 IS NOT NULL AND channel_category_2 != '' AND
          channel_category_3 IS NOT NULL AND channel_category_3 != ''
      )
      SELECT
        ARRAY_AGG(DISTINCT code30) as code30,
        ARRAY_AGG(DISTINCT channel_name) as channel_name,
        ARRAY_AGG(DISTINCT channel_category_2) as channel_category_2,
        ARRAY_AGG(DISTINCT channel_category_3) as channel_category_3
      FROM UniqueOrderValues
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
            // JSON 파싱 실패 시 무시하고 빈 배열 반환
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

    // 제품 필터 옵션 추출
    const productFilterOptions = {
      supply_name: productData.rows?.[0]?.f?.[0]?.v ? 
        safeParseArray(productData.rows[0].f[0].v) : [],
      extra_column2: productData.rows?.[0]?.f?.[1]?.v ? 
        safeParseArray(productData.rows[0].f[1].v) : [],
      exclusive2: productData.rows?.[0]?.f?.[2]?.v ? 
        safeParseArray(productData.rows[0].f[2].v) : [],
    };

    // 주문 필터 옵션 추출
    const orderFilterOptions = {
      code30: orderData.rows?.[0]?.f?.[0]?.v ? 
        safeParseArray(orderData.rows[0].f[0].v) : [],
      channel_name: orderData.rows?.[0]?.f?.[1]?.v ? 
        safeParseArray(orderData.rows[0].f[1].v) : [],
      channel_category_2: orderData.rows?.[0]?.f?.[2]?.v ? 
        safeParseArray(orderData.rows[0].f[2].v) : [],
      channel_category_3: orderData.rows?.[0]?.f?.[3]?.v ? 
        safeParseArray(orderData.rows[0].f[3].v) : [],
    };

    // 필터 옵션 결합
    const filterOptions = {
      ...productFilterOptions,
      ...orderFilterOptions
    };

    // 결과 캐싱
    cachedResults = {
      extra_column2: Array.from(new Set(filterOptions.extra_column2)),
      supply_name: Array.from(new Set(filterOptions.supply_name)),
      exclusive2: Array.from(new Set(filterOptions.exclusive2)),
      lastUpdated: Date.now()
    };

    return NextResponse.json(filterOptions);
  } catch (error) {
    console.error('필터 옵션 조회 오류:', error);
    
    // 에러 발생 시 캐시된 결과가 있다면 반환
    if (cachedResults) {
      return NextResponse.json({
        extra_column2: cachedResults.extra_column2,
        supply_name: cachedResults.supply_name,
        exclusive2: cachedResults.exclusive2
      });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : '필터 옵션 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 