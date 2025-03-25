import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createPrivateKey } from 'crypto';

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

    const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/queries`;
    
    // BigQuery 쿼리 수정 - extra_column2와 supply_name만 조회
    const query = `
      SELECT DISTINCT
        extra_column2,
        supply_name,
        exclusive2
      FROM \`third-current-410914.project_m.product_db\`
      WHERE extra_column2 IS NOT NULL
         OR supply_name IS NOT NULL
         OR exclusive2 IS NOT NULL
      LIMIT 1000
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

    // 결과 데이터 가공
    const extra_column2 = new Set<string>();
    const supply_name = new Set<string>();
    const exclusive2 = new Set<string>();

    data.rows?.forEach((row: any) => {
      const [extra, sup, excl] = row.f.map((field: any) => field.v);
      if (extra) extra_column2.add(extra);
      if (sup) supply_name.add(sup);
      if (excl) exclusive2.add(excl);
    });

    // 결과 캐싱
    cachedResults = {
      extra_column2: Array.from(extra_column2).sort(),
      supply_name: Array.from(supply_name).sort(),
      exclusive2: Array.from(exclusive2).sort(),
      lastUpdated: Date.now()
    };

    return NextResponse.json({
      extra_column2: cachedResults.extra_column2,
      supply_name: cachedResults.supply_name,
      exclusive2: cachedResults.exclusive2
    });
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