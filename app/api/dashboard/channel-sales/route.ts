import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createPrivateKey } from 'crypto';

export const dynamic = 'force-dynamic'; // 이 API는 항상 동적으로 실행

// 디버깅을 위한 로그 함수
const logDebug = (message: string, data?: any) => {
  console.log(`[CHANNEL-SALES-DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

// 환경변수 로깅
logDebug('환경변수 확인', {
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'not_set',
  hasClientEmail: !!process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
  hasPrivateKey: !!process.env.GOOGLE_CLOUD_PRIVATE_KEY,
  hasPrivateKeyId: !!process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID
});

export async function GET(request: NextRequest) {
  logDebug('API 호출 시작', { url: request.url });

  try {
    // URL에서 날짜 파라미터 가져오기
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const category2 = searchParams.get('category2');
    const category3 = searchParams.get('category3');
    const channel = searchParams.get('channel');
    
    // 날짜가 없으면 어제 날짜 사용
    const targetStartDate = startDate || new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0];
    const targetEndDate = endDate || targetStartDate;
    
    logDebug('요청 파라미터', { 
      startDate, 
      endDate, 
      category2, 
      category3, 
      channel,
      targetStartDate,
      targetEndDate
    });

    // 채널별 판매 데이터를 가져오는 쿼리
    const query = `
      WITH channel_sales AS (
        SELECT 
          channel_name AS channel,
          SUM(qty) AS quantity,
          SUM(final_calculated_amount) AS revenue
        FROM 
          \`third-current-410914.project_m.order_db\`
        WHERE 
          channel_name IS NOT NULL
          AND CAST(order_date AS STRING) >= '${targetStartDate}'
          AND CAST(order_date AS STRING) <= '${targetEndDate}'
          ${category2 ? `AND channel_category_2 = '${category2}'` : ''}
          ${category3 ? `AND channel_category_3 = '${category3}'` : ''}
          ${channel ? `AND channel_name = '${channel}'` : ''}
        GROUP BY 
          channel_name
      ),
      category_sales AS (
        SELECT 
          p.category_3 AS category,
          SUM(o.qty) AS quantity,
          SUM(o.final_calculated_amount) AS revenue
        FROM 
          \`third-current-410914.project_m.order_db\` o
        JOIN 
          \`third-current-410914.project_m.product_db\` p
        ON 
          o.options_product_id = p.options_product_id
        WHERE 
          CAST(o.order_date AS STRING) >= '${targetStartDate}'
          AND CAST(o.order_date AS STRING) <= '${targetEndDate}'
          ${category2 ? `AND o.channel_category_2 = '${category2}'` : ''}
          ${category3 ? `AND o.channel_category_3 = '${category3}'` : ''}
          ${channel ? `AND o.channel_name = '${channel}'` : ''}
        GROUP BY 
          p.category_3
      )
      SELECT 
        'channel' as type,
        channel as name,
        quantity,
        revenue
      FROM channel_sales
      UNION ALL
      SELECT 
        'category' as type,
        category as name,
        quantity,
        revenue
      FROM category_sales
      ORDER BY 
        type,
        revenue DESC
    `;

    logDebug('실행할 쿼리:', { 
      query,
      filters: {
        category2,
        category3,
        channel
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
    
    logDebug('JWT 토큰 생성 시작');
    
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
    
    logDebug('JWT 토큰 생성 완료');

    // OAuth 2.0 액세스 토큰 얻기
    logDebug('OAuth 토큰 요청 시작');
    
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
      logDebug('OAuth 토큰 요청 실패', tokenData);
      throw new Error(`액세스 토큰 획득 실패: ${JSON.stringify(tokenData)}`);
    }

    logDebug('OAuth 토큰 획득 성공');
    const { access_token } = tokenData;

    // BigQuery API 요청
    logDebug('BigQuery API 요청 시작');
    
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
      logDebug('BigQuery API 요청 실패', data);
      logDebug('오류 상세 정보', {
        error: data.error || {},
        message: data.error?.message || '상세 오류 정보 없음',
        status: response.status,
        statusText: response.statusText
      });
      throw new Error(`BigQuery API 요청 실패: ${JSON.stringify(data)}`);
    }

    logDebug('BigQuery API 응답 성공', { 
      hasRows: !!data.rows,
      rowCount: data.rows?.length || 0,
      totalRows: data.totalRows,
      // 응답 데이터의 구조와 처음 몇 개의 행 출력
      schema: data.schema,
      sampleRows: data.rows?.slice(0, 3)
    });

    // 결과가 없는 경우 빈 배열 반환
    if (!data.rows || data.rows.length === 0) {
      logDebug('결과 없음 - 빈 배열 반환');
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    // 결과 변환
    const results = data.rows.map((row: any) => {
      const type = row.f[0].v;
      const name = row.f[1].v;
      const quantity = Number(row.f[2].v);
      const revenue = Number(row.f[3].v);
      
      return {
        type,
        name,
        quantity,
        revenue,
      };
    });

    // 채널별과 카테고리별 데이터 분리
    const channelData = results.filter((item: { type: string; name: string; quantity: number; revenue: number }) => item.type === 'channel');
    const categoryData = results.filter((item: { type: string; name: string; quantity: number; revenue: number }) => item.type === 'category');

    logDebug('데이터 변환 완료', { 
      channelCount: channelData.length,
      categoryCount: categoryData.length,
      firstChannel: channelData[0],
      firstCategory: categoryData[0],
      channelData: channelData.slice(0, 3), // 처음 3개 채널 데이터
      categoryData: categoryData.slice(0, 3), // 처음 3개 카테고리 데이터
      appliedFilters: {
        category2,
        category3,
        channel
      }
    });

    // 결과 반환
    return NextResponse.json({ 
      channelData,
      categoryData 
    }, { status: 200 });
  } catch (error: any) {
    logDebug('채널별 판매 데이터 조회 오류', { 
      message: error.message,
      stack: error.stack
    });
    
    return NextResponse.json(
      { error: error.message || '데이터를 불러오는 중 오류가 발생했습니다.' }, 
      { status: 500 }
    );
  }
} 