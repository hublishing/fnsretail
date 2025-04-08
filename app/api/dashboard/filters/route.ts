import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createPrivateKey } from 'crypto';

export const dynamic = 'force-dynamic';

const logDebug = (message: string, data?: any) => {
  console.log(`[FILTERS-DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

export async function GET(request: NextRequest) {
  logDebug('API 호출 시작', { url: request.url });

  try {
    const searchParams = request.nextUrl.searchParams;
    const category2 = searchParams.get('category2');
    const category3 = searchParams.get('category3');
    const country = searchParams.get('country');
    const brand = searchParams.get('brand');
    const channel = searchParams.get('channel');
    const manager = searchParams.get('manager');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    logDebug('요청 파라미터', { 
      category2, 
      category3,
      country,
      brand,
      channel,
      manager,
      startDate,
      endDate
    });

    // 필터 데이터를 가져오는 쿼리
    let query = `
      WITH base_data AS (
        SELECT DISTINCT
          o.order_date,
          o.channel_name as channel,
          o.code30 as country,
          o.manager,
          o.channel_category_2 as category2,
          o.channel_category_3 as category3,
          p.brand,
          o.final_calculated_amount as amount
        FROM \`third-current-410914.project_m.order_db\` o
        JOIN \`third-current-410914.project_m.product_db\` p
        ON o.options_product_id = p.options_product_id
        WHERE o.order_date BETWEEN '${startDate}' AND '${endDate}'
      `;

    // 브랜드 필터링
    if (brand) {
      query += `
        AND p.brand = '${brand}'
      `;
    }

    // 국가 필터링
    if (country) {
      query += `
        AND o.code30 = '${country}'
      `;
    }

    // 구분 필터링
    if (category2) {
      query += `
        AND o.channel_category_2 = '${category2}'
      `;
    }

    // 분류 필터링
    if (category3) {
      query += `
        AND o.channel_category_3 = '${category3}'
      `;
    }

    // 채널 필터링
    if (channel) {
      query += `
        AND o.channel_name = '${channel}'
      `;
    }

    // 매니저 필터링
    if (manager) {
      query += `
        AND o.manager = '${manager}'
      `;
    }

    query += `
      ),
      category2_data AS (
        SELECT DISTINCT category2, SUM(amount) as total_amount
        FROM base_data
        WHERE category2 IS NOT NULL AND category2 != 'nan'
        GROUP BY category2
        ORDER BY total_amount DESC
      ),
      category3_data AS (
        SELECT DISTINCT category3, SUM(amount) as total_amount
        FROM base_data
        WHERE category3 IS NOT NULL AND category3 != 'nan'
        GROUP BY category3
        ORDER BY total_amount DESC
      ),
      channel_data AS (
        SELECT DISTINCT channel, SUM(amount) as total_amount
        FROM base_data
        WHERE channel IS NOT NULL AND channel != 'nan'
        GROUP BY channel
        ORDER BY total_amount DESC
      ),
      country_data AS (
        SELECT DISTINCT country, SUM(amount) as total_amount
        FROM base_data
        WHERE country IS NOT NULL AND country != 'nan'
        GROUP BY country
        ORDER BY total_amount DESC
      ),
      brand_data AS (
        SELECT DISTINCT brand, SUM(amount) as total_amount
        FROM base_data
        WHERE brand IS NOT NULL AND brand != 'nan'
        GROUP BY brand
        ORDER BY total_amount DESC
      ),
      manager_data AS (
        SELECT DISTINCT manager, SUM(amount) as total_amount
        FROM base_data
        WHERE manager IS NOT NULL AND manager != 'nan'
        GROUP BY manager
        ORDER BY total_amount DESC
      )
      SELECT 
        'category2' as filter_type, category2 as value, total_amount
      FROM category2_data
      UNION ALL
      SELECT 
        'category3' as filter_type, category3 as value, total_amount
      FROM category3_data
      UNION ALL
      SELECT 
        'channel' as filter_type, channel as value, total_amount
      FROM channel_data
      UNION ALL
      SELECT 
        'country' as filter_type, country as value, total_amount
      FROM country_data
      UNION ALL
      SELECT 
        'brand' as filter_type, brand as value, total_amount
      FROM brand_data
      UNION ALL
      SELECT 
        'manager' as filter_type, manager as value, total_amount
      FROM manager_data
      ORDER BY filter_type, total_amount DESC
    `;

    logDebug('실행할 쿼리:', { 
      query,
      filters: {
        category2,
        category3,
        country,
        brand,
        channel,
        manager
      }
    });

    // Google Cloud API 엔드포인트
    const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/queries`;

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

    // 결과 변환
    const results = data.rows.map((row: any) => ({
      type: row.f[0].v,
      value: row.f[1].v
    }));

    // 타입별로 데이터 분리
    const filters = {
      category2: results.filter((item: { type: string; value: string }) => item.type === 'category2').map((item: { type: string; value: string }) => item.value),
      category3: results.filter((item: { type: string; value: string }) => item.type === 'category3').map((item: { type: string; value: string }) => item.value),
      channel: results.filter((item: { type: string; value: string }) => item.type === 'channel').map((item: { type: string; value: string }) => item.value),
      country: results.filter((item: { type: string; value: string }) => item.type === 'country').map((item: { type: string; value: string }) => item.value),
      brand: results.filter((item: { type: string; value: string }) => item.type === 'brand').map((item: { type: string; value: string }) => item.value),
      manager: results.filter((item: { type: string; value: string }) => item.type === 'manager').map((item: { type: string; value: string }) => item.value)
    };

    return NextResponse.json(filters, { status: 200 });
  } catch (error: any) {
    logDebug('필터 데이터 조회 오류', { 
      message: error.message,
      stack: error.stack
    });
    
    return NextResponse.json(
      { error: error.message || '데이터를 불러오는 중 오류가 발생했습니다.' }, 
      { status: 500 }
    );
  }
} 