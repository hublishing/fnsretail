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
    
    logDebug('요청 파라미터', { 
      category2, 
      category3,
      country
    });

    // 필터 데이터를 가져오는 쿼리
    const query = `
      WITH base_data AS (
        SELECT DISTINCT
          code30,
          channel_category_2,
          channel_category_3,
          channel_name,
          final_calculated_amount
        FROM \`third-current-410914.project_m.order_db\`
        WHERE code30 IS NOT NULL
        AND code30 != 'nan'
        AND code30 != ''
        ${country ? `AND code30 = '${country}'` : ''}
        ${category2 ? `AND channel_category_2 = '${category2}'` : ''}
        ${category3 ? `AND channel_category_3 = '${category3}'` : ''}
      ),
      category2_data AS (
        SELECT DISTINCT 
          channel_category_2 as value,
          SUM(final_calculated_amount) as total_amount
        FROM base_data
        WHERE channel_category_2 IS NOT NULL
        AND channel_category_2 != 'nan'
        AND channel_category_2 != ''
        GROUP BY channel_category_2
        ORDER BY total_amount DESC, value
      ),
      category3_data AS (
        SELECT DISTINCT 
          channel_category_3 as value,
          SUM(final_calculated_amount) as total_amount
        FROM base_data
        WHERE channel_category_3 IS NOT NULL
        AND channel_category_3 != 'nan'
        AND channel_category_3 != ''
        GROUP BY channel_category_3
        ORDER BY total_amount DESC, value
      ),
      channel_data AS (
        SELECT DISTINCT 
          channel_name as value,
          SUM(final_calculated_amount) as total_amount
        FROM base_data
        WHERE channel_name IS NOT NULL
        AND channel_name != 'nan'
        AND channel_name != ''
        GROUP BY channel_name
        ORDER BY total_amount DESC, value
      ),
      country_data AS (
        SELECT DISTINCT 
          code30 as value,
          SUM(final_calculated_amount) as total_amount
        FROM \`third-current-410914.project_m.order_db\`
        WHERE code30 IS NOT NULL
        AND code30 != 'nan'
        AND code30 != ''
        GROUP BY code30
        ORDER BY total_amount DESC, value
      )
      SELECT 
        'category2' as type,
        value
      FROM category2_data
      UNION ALL
      SELECT 
        'category3' as type,
        value
      FROM category3_data
      UNION ALL
      SELECT 
        'channel' as type,
        value
      FROM channel_data
      UNION ALL
      SELECT 
        'country' as type,
        value
      FROM country_data
      ORDER BY type, value
    `;

    logDebug('실행할 쿼리:', { 
      query,
      filters: {
        category2,
        category3,
        country
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
      country: results.filter((item: { type: string; value: string }) => item.type === 'country').map((item: { type: string; value: string }) => item.value)
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